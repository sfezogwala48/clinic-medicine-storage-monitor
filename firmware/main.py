"""Clinic medicine storage monitor - generic Raspberry Pi Pico W firmware.

One binary (MicroPython), four roles selected in config.py:

  storage  publishes {deviceId, temperatureC, humidityPct, recordedAt}
           to clinic/storage/<DEVICE_ID>/telemetry
  climate  publishes {sensorId, temp, humidity, recordedAt}
           to clinic/sensors/<SENSOR_ID>/telemetry/climate
  door     publishes {sensorId, containerOpen, recordedAt}
           to clinic/sensors/<SENSOR_ID>/telemetry/door on change + heartbeat
  buzzer   subscribes to clinic/actuators/<ACTUATOR_ID>/commands/buzzer,
           drives the buzzer pin, acks on clinic/actuators/<ACTUATOR_ID>/status

Topics and payloads mirror server/src/mqtt/mqtt.options.ts and
server/src/notifications/notification.dto.ts. Sensor roles publish a
retained online status on connect and register a retained offline last-will
so the server's clinic/sensors/<id>/status handler sees both edges.

Behavior on failure: the sensor roles keep sampling while the link is down.
Every reading is appended to the microSD history (sdlog.py); readings that
cannot be sent are queued on the card and replayed, oldest first, once the
session is back. Sensor roles reconnect through Uplink below; the buzzer
relies on umqtt.robust. If something else breaks, main() re-establishes WiFi
and rebuilds the session. The device never needs a reset to recover.
"""

import json
import time

import config
import machine
import sdlog
from net import (
    clock_due,
    connect_wifi,
    iso_utc,
    local_hms,
    local_iso,
    local_time_str,
    sync_clock,
    wifi_nudge,
    wifi_ok,
)
from umqtt.robust import MQTTClient
from umqtt.simple import MQTTClient as SimpleClient

# ---------------------------------------------------------------------------
# Role constants (match config.ROLE)
# ---------------------------------------------------------------------------
ROLE_STORAGE = "storage"
ROLE_CLIMATE = "climate"
ROLE_DOOR = "door"
ROLE_BUZZER = "buzzer"

LED = machine.Pin("LED", machine.Pin.OUT)


def log(*args):
    # Console stamps are local time (SAST); the payloads themselves stay UTC.
    print("[%s] [%s]" % (local_hms() or "--:--:--", config.DEVICE_ID), *args)


def blink(n=1, ms=80):
    for _ in range(n):
        LED.on()
        time.sleep_ms(ms)
        LED.off()
        if n > 1:
            time.sleep_ms(ms)


def dumps(payload):
    return json.dumps(payload)


def sensor_status_topic():
    return "clinic/sensors/%s/status" % config.SENSOR_ID


def actuator_status_topic():
    return "clinic/actuators/%s/status" % config.ACTUATOR_ID


def make_client():
    """Build the MQTT client for the configured role (not connected yet)."""
    client = MQTTClient(
        "pico-%s-%s" % (config.ROLE, config.DEVICE_ID),
        config.MQTT_BROKER,
        config.MQTT_PORT,
        user=config.MQTT_USER,
        password=config.MQTT_PASSWORD,
        keepalive=config.MQTT_KEEPALIVE,
    )
    client.DEBUG = True

    if config.ROLE != ROLE_BUZZER:
        # Retained last-will: if the device dies, the server flips it offline.
        client.set_last_will(
            sensor_status_topic(), dumps({"online": False}), retain=True, qos=0
        )

    return client


def connect_client(client):
    # A socket timeout makes a dead link raise OSError instead of hanging, but
    # the buzzer blocks on wait_msg() between commands, so it must not have one.
    timeout = None if config.ROLE == ROLE_BUZZER else config.MQTT_SOCKET_TIMEOUT_S
    client.connect(clean_session=False, timeout=timeout)
    log("mqtt: connected to %s:%s as %s (%s role)" % (
        config.MQTT_BROKER, config.MQTT_PORT, client.client_id, config.ROLE))


def publish_online(client):
    if config.ROLE != ROLE_BUZZER:
        # SimpleClient, not robust: raise on failure rather than retry forever.
        SimpleClient.publish(
            client,
            sensor_status_topic().encode(),
            dumps({"online": True}).encode(),
            retain=True,
            qos=0,
        )
    blink(2)


def buzzer_mode(text):
    """Map a server buzzer command to "off", "beep" or "continuous".

    Alerts arrive as {"on": true, "pattern": "beep"}; only an explicit
    "continuous" gives a solid tone, so anything else that turns the buzzer
    on beeps. The server publishes through NestJS, which wraps the payload as
    {"pattern": <topic>, "data": {...}}, so that envelope is unwrapped first.
    Plain "on"/"true"/"1" text is accepted too.
    """
    try:
        command = json.loads(text)
    except ValueError:
        command = text.strip().lower() in ("on", "true", "1")
    if isinstance(command, dict) and isinstance(command.get("data"), dict):
        command = command["data"]
    if isinstance(command, dict):
        on = bool(command.get("on", False))
        pattern = command.get("pattern")
    else:
        on = bool(command)
        pattern = None
    if not on:
        return "off"
    return "continuous" if pattern == "continuous" else "beep"


class Buzzer:
    """Buzzer on BUZZER_PIN: off, beeping, or solid. Call update() often (~20 ms).

    Beeping is driven by the clock rather than sleeps, so the main loop keeps
    sampling, publishing and listening for commands while it sounds.
    """

    def __init__(self):
        self.pin = machine.Pin(config.BUZZER_PIN, machine.Pin.OUT, value=0)
        self.mode = "off"
        self.started = time.ticks_ms()

    def set(self, mode):
        if mode != self.mode:
            self.mode = mode
            self.started = time.ticks_ms()  # start every beep sequence on a beep
            log("buzzer %s" % mode.upper())
        self.update()

    def update(self):
        if self.mode == "beep":
            phase = time.ticks_diff(time.ticks_ms(), self.started) % (
                config.BUZZER_BEEP_ON_MS + config.BUZZER_BEEP_OFF_MS
            )
            self.pin.value(1 if phase < config.BUZZER_BEEP_ON_MS else 0)
        else:
            self.pin.value(1 if self.mode == "continuous" else 0)


def buzzer_topic():
    return "clinic/actuators/%s/commands/buzzer" % config.ACTUATOR_ID


class Uplink:
    """Publisher for the sensor roles that keeps working through outages.

    umqtt.robust would retry a failed publish forever, stalling sampling for
    the whole outage. Uplink instead queues readings on the SD card, retries
    the connection every RECONNECT_DELAY_S, and replays the backlog in order
    (SD_REPLAY_BATCH rows per tick) before sending live readings again.
    Call tick() regularly; send() for each reading.

    With a Buzzer attached it also listens for the server's buzzer commands
    (clinic/actuators/<ACTUATOR_ID>/commands/buzzer): idle() sleeps while
    polling for them and keeping the beep pattern going.
    """

    def __init__(self, client, buzzer=None):
        self.client = client
        self.buzzer = buzzer
        self.up = False
        self.last_try = time.ticks_ms()

    def _down(self, e):
        if self.up:
            log("link down, queueing readings on SD: %r" % e)
        self.up = False
        self.last_try = time.ticks_ms()

    def _publish(self, topic, body):
        SimpleClient.publish(self.client, topic, body, False, 0)

    def connect(self):
        try:
            connect_client(self.client)
            publish_online(self.client)
            if self.buzzer is not None:
                self.client.set_callback(self._on_command)
                self.client.subscribe(buzzer_topic().encode(), qos=0)
                # Registers this Pico as an actuator so alerts at its location reach it.
                self._publish(
                    actuator_status_topic().encode(), dumps({"state": "online"}).encode()
                )
            self.up = True
            log("link up")
        except OSError as e:
            log("mqtt: connect failed: %r" % e)
            self._down(e)

    def tick(self):
        """Reconnect if down, keep the clock synced, then replay a batch of the backlog."""
        if not self.up:
            if time.ticks_diff(time.ticks_ms(), self.last_try) < config.RECONNECT_DELAY_S * 1000:
                return
            self.last_try = time.ticks_ms()
            if not wifi_ok():
                wifi_nudge()
                return
            self.connect()
        if self.up:
            if clock_due():  # retry if the boot sync failed, then daily for drift
                sync_clock(attempts=1)
            try:
                sdlog.drain(self._publish, config.SD_REPLAY_BATCH)
            except OSError as e:
                self._down(e)

    def send(self, topic, payload):
        body = dumps(payload)
        # While a backlog exists new readings queue behind it to keep order.
        if self.up and not sdlog.has_backlog():
            try:
                self._publish(topic.encode(), body.encode())
                return
            except OSError as e:
                self._down(e)
        sdlog.enqueue(topic, body)

    def _on_command(self, topic, msg):
        text = msg.decode()
        log("<- %s %s" % (topic.decode(), text))
        mode = buzzer_mode(text)
        self.buzzer.set(mode)
        try:  # ack; the server just marks the actuator as seen
            self._publish(
                actuator_status_topic().encode(),
                dumps({"state": "ack", "command": "off" if mode == "off" else "on"}).encode(),
            )
        except OSError as e:
            self._down(e)

    def poll(self):
        """Advance the beep pattern and handle at most one pending command."""
        if self.buzzer is None:
            return
        self.buzzer.update()
        if not self.up:
            return
        try:
            SimpleClient.check_msg(self.client)
            # wait_msg() leaves the socket blocking; restore the timeout so a
            # dead link still raises instead of hanging the next publish.
            self.client.sock.settimeout(config.MQTT_SOCKET_TIMEOUT_S)
        except OSError as e:
            self._down(e)

    def idle(self, seconds):
        """Sleep `seconds` while polling, so the buzzer and commands stay responsive."""
        end = time.ticks_add(time.ticks_ms(), int(seconds * 1000))
        while time.ticks_diff(end, time.ticks_ms()) > 0:
            self.poll()
            time.sleep_ms(20)


# ---------------------------------------------------------------------------
# DHT22 / DHT11 reading (storage + climate roles)
# ---------------------------------------------------------------------------
_dht = None


def dht_sensor():
    global _dht
    if _dht is None:
        import dht

        cls = dht.DHT11 if config.SENSOR_TYPE == "dht11" else dht.DHT22
        _dht = cls(machine.Pin(config.DHT_PIN))
    return _dht


def read_temp_humidity():
    """Return (temp_c, humidity_pct) or None after 3 failed measures."""
    sensor = dht_sensor()
    for attempt in range(3):
        try:
            sensor.measure()
            return sensor.temperature(), sensor.humidity()
        except OSError as e:
            log("dht: measure failed (%r), attempt %d/3" % (e, attempt + 1))
            time.sleep(2)
    return None


# ---------------------------------------------------------------------------
# SSD1306 OLED local display helper (storage role)
# ---------------------------------------------------------------------------
_oled = None


def oled_display():
    global _oled
    if _oled is None:
        from machine import I2C, Pin
        import ssd1306

        try:
            i2c = I2C(0, scl=Pin(config.OLED_SCL_PIN), sda=Pin(config.OLED_SDA_PIN), freq=config.OLED_I2C_FREQ)
            _oled = ssd1306.SSD1306_I2C(128, 64, i2c, addr=config.OLED_ADDR)
            _oled.fill(0)
            _oled.text("Booting...", 0, 30)
            _oled.show()
        except Exception as e:
            log("oled: init failed: %r" % e)
            _oled = None
    return _oled


def show_oled(temp_c=None, humidity=None, door_open=None):
    """Refresh the local display; silently skip if the OLED is absent."""
    oled = oled_display()
    if oled is None:
        return
    oled.fill(0)
    if temp_c is not None:
        oled.text("Temp: {:.1f} C".format(temp_c), 0, 0)
    if humidity is not None:
        oled.text("Humidity: {:.1f} %".format(humidity), 0, 16)
    if door_open is not None:
        oled.text("Door: " + ("OPEN" if door_open else "CLOSED"), 0, 32)
    oled.text(local_time_str() or "time not synced", 0, 48)  # SAST
    oled.show()


# ---------------------------------------------------------------------------
# Role: storage (clinic/storage/<id>/telemetry)
# ---------------------------------------------------------------------------
def run_storage(uplink):
    reed = machine.Pin(config.DOOR_PIN, machine.Pin.IN, machine.Pin.PULL_UP)

    while True:
        uplink.tick()
        reading = read_temp_humidity()
        if reading is not None:
            temp_c, humidity = reading
            payload = {
                "deviceId": config.DEVICE_ID,
                "temperatureC": round(temp_c, 1),
                "humidityPct": round(humidity, 1),
                "recordedAt": iso_utc(),
            }
            topic = "clinic/storage/%s/telemetry" % config.DEVICE_ID
            uplink.send(topic, payload)
            log("-> %s %s" % (topic, payload))

            door_open = reed.value() == 1
            if not config.DOOR_CLOSED_WHEN_LOW:
                door_open = not door_open
            door_payload = {
                "sensorId": config.DEVICE_ID,
                "containerOpen": door_open,
                "recordedAt": iso_utc(),
            }
            door_topic = "clinic/sensors/%s/telemetry/door" % config.DEVICE_ID
            uplink.send(door_topic, door_payload)
            log("-> %s %s" % (door_topic, door_payload))
            sdlog.log_history(local_iso(), config.DEVICE_ID, payload["temperatureC"],
                              payload["humidityPct"], door_open)

            show_oled(temp_c, humidity, door_open)
        else:
            log("dht: no reading this cycle")
        uplink.idle(config.READ_INTERVAL_S)


# ---------------------------------------------------------------------------
# Role: climate (clinic/sensors/<id>/telemetry/climate)
# ---------------------------------------------------------------------------
def run_climate(uplink):
    while True:
        uplink.tick()
        reading = read_temp_humidity()
        if reading is not None:
            temp_c, humidity = reading
            payload = {
                "sensorId": config.SENSOR_ID,
                "temp": round(temp_c, 1),
                "humidity": round(humidity, 1),
                "recordedAt": iso_utc(),
            }
            topic = "clinic/sensors/%s/telemetry/climate" % config.SENSOR_ID
            uplink.send(topic, payload)
            log("-> %s %s" % (topic, payload))
            sdlog.log_history(local_iso(), config.SENSOR_ID, payload["temp"],
                              payload["humidity"])
        else:
            log("dht: no reading this cycle")
        time.sleep(config.READ_INTERVAL_S)


# ---------------------------------------------------------------------------
# Role: door (clinic/sensors/<id>/telemetry/door)
# ---------------------------------------------------------------------------
def run_door(uplink):
    pin = machine.Pin(config.DOOR_PIN, machine.Pin.IN, machine.Pin.PULL_UP)
    topic = "clinic/sensors/%s/telemetry/door" % config.SENSOR_ID

    def door_open():
        closed = pin.value() == 0  # LOW = switch closed to GND
        if config.DOOR_CLOSED_WHEN_LOW:
            return not closed
        return closed

    def publish_state():
        payload = {
            "sensorId": config.SENSOR_ID,
            "containerOpen": door_open(),
            "recordedAt": iso_utc(),
        }
        uplink.send(topic, payload)
        log("-> %s %s" % (topic, payload))
        sdlog.log_history(local_iso(), config.SENSOR_ID,
                          door_open=payload["containerOpen"])

    publish_state()  # initial state so the dashboard starts correct
    last_state = door_open()
    last_sent = time.ticks_ms()
    last_tick = last_sent

    while True:
        time.sleep_ms(20)
        if time.ticks_diff(time.ticks_ms(), last_tick) > 2000:
            uplink.tick()  # reconnect / replay even when the door is quiet
            last_tick = time.ticks_ms()
        state = door_open()
        if state != last_state:
            time.sleep_ms(config.DOOR_DEBOUNCE_MS)
            if door_open() == state:  # still the same after debounce
                publish_state()
                last_state = state
                last_sent = time.ticks_ms()
        elif time.ticks_diff(time.ticks_ms(), last_sent) > config.DOOR_HEARTBEAT_S * 1000:
            publish_state()
            last_sent = time.ticks_ms()


# ---------------------------------------------------------------------------
# Role: buzzer (subscribe commands, drive pin, ack)
# ---------------------------------------------------------------------------
def run_buzzer(client):
    buzzer = Buzzer()
    client.set_callback(None)
    client.subscribe(buzzer_topic().encode(), qos=0)
    log("listening on %s" % buzzer_topic())

    def on_command(topic, msg):
        text = msg.decode()
        log("<- %s %s" % (topic.decode(), text))
        mode = buzzer_mode(text)
        buzzer.set(mode)
        # Ack back to the server (handleBuzzerStatus just marks the actuator seen).
        client.publish(
            actuator_status_topic().encode(),
            dumps({"state": "ack", "command": "off" if mode == "off" else "on"}).encode(),
            qos=0,
        )

    client.set_callback(on_command)
    while True:
        client.check_msg()  # non-blocking, so the beep pattern keeps running
        buzzer.update()
        time.sleep_ms(20)


# ---------------------------------------------------------------------------
# Main loop with WiFi/MQTT recovery
# ---------------------------------------------------------------------------
ROLE_RUNNERS = {
    ROLE_STORAGE: run_storage,
    ROLE_CLIMATE: run_climate,
    ROLE_DOOR: run_door,
    ROLE_BUZZER: run_buzzer,
}


def run_role_forever():
    """Create a session and run the role until something unexpected breaks."""
    client = make_client()
    runner = ROLE_RUNNERS[config.ROLE]
    if config.ROLE == ROLE_BUZZER:
        connect_client(client)
        publish_online(client)
        runner(client)
        return
    # Sensor roles sample even if the broker is unreachable right now: the
    # uplink queues to the SD card and keeps retrying the connection.
    buzzer = Buzzer() if config.ROLE == ROLE_STORAGE and config.STORAGE_HAS_BUZZER else None
    uplink = Uplink(client, buzzer)
    uplink.connect()
    runner(uplink)


def main():
    log("firmware starting: role=%s id=%s" % (config.ROLE, config.DEVICE_ID))
    if config.ROLE == ROLE_STORAGE:
        oled_display()
    connect_wifi()

    if config.ROLE == ROLE_STORAGE:
        show_oled(temp_c=None, humidity=None, door_open=None)
    sync_clock()
    if config.ROLE != ROLE_BUZZER:
        sdlog.mount()

    runner = ROLE_RUNNERS.get(config.ROLE)
    if runner is None:
        raise SystemExit("config.ROLE must be one of %s" % sorted(ROLE_RUNNERS))

    while True:
        try:
            run_role_forever()
        except OSError as e:
            log("connection lost: %r" % e)
            buzzer_cleanup()
        except Exception as e:
            log("unexpected error: %r" % e)
            buzzer_cleanup()
        while not wifi_ok():
            log("wifi down, retrying in %ds" % config.RECONNECT_DELAY_S)
            time.sleep(config.RECONNECT_DELAY_S)
            connect_wifi()
        time.sleep(config.RECONNECT_DELAY_S)


def buzzer_cleanup():
    """Silence the buzzer if we lose connectivity while it is sounding."""
    try:
        machine.Pin(config.BUZZER_PIN, machine.Pin.OUT, value=0)
    except Exception:
        pass


if __name__ == "__main__":
    main()