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

Behavior on failure: umqtt.robust reconnects the MQTT session on its own; if
WiFi itself drops (OSError bubbles up), main() re-establishes WiFi and
rebuilds the session. The device never needs a reset to recover.
"""

import json
import time

import config
import machine
from net import connect_wifi, iso_utc, sync_clock, wifi_ok
from umqtt.robust import MQTTClient

# ---------------------------------------------------------------------------
# Role constants (match config.ROLE)
# ---------------------------------------------------------------------------
ROLE_STORAGE = "storage"
ROLE_CLIMATE = "climate"
ROLE_DOOR = "door"
ROLE_BUZZER = "buzzer"

LED = machine.Pin("LED", machine.Pin.OUT)


def log(*args):
    print("[%s]" % config.DEVICE_ID, *args)


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
    """Build + connect the MQTT session for the configured role."""
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

    client.connect(clean_session=False)
    log("mqtt: connected to %s:%s as %s (%s role)" % (
        config.MQTT_BROKER, config.MQTT_PORT, client.client_id, config.ROLE))
    return client


def publish_online(client):
    if config.ROLE != ROLE_BUZZER:
        client.publish(
            sensor_status_topic().encode(),
            dumps({"online": True}).encode(),
            retain=True,
            qos=0,
        )
    blink(2)


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
# Role: storage (clinic/storage/<id>/telemetry)
# ---------------------------------------------------------------------------
def run_storage(client):
    while True:
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
            client.publish(topic.encode(), dumps(payload).encode(), qos=0)
            log("-> %s %s" % (topic, payload))
        else:
            log("dht: no reading this cycle")
        time.sleep(config.READ_INTERVAL_S)


# ---------------------------------------------------------------------------
# Role: climate (clinic/sensors/<id>/telemetry/climate)
# ---------------------------------------------------------------------------
def run_climate(client):
    while True:
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
            client.publish(topic.encode(), dumps(payload).encode(), qos=0)
            log("-> %s %s" % (topic, payload))
        else:
            log("dht: no reading this cycle")
        time.sleep(config.READ_INTERVAL_S)


# ---------------------------------------------------------------------------
# Role: door (clinic/sensors/<id>/telemetry/door)
# ---------------------------------------------------------------------------
def run_door(client):
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
        client.publish(topic.encode(), dumps(payload).encode(), qos=0)
        log("-> %s %s" % (topic, payload))

    publish_state()  # initial state so the dashboard starts correct
    last_state = door_open()
    last_sent = time.ticks_ms()

    while True:
        time.sleep_ms(20)
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
    buzzer = machine.Pin(config.BUZZER_PIN, machine.Pin.OUT, value=0)
    cmd_topic = "clinic/actuators/%s/commands/buzzer" % config.ACTUATOR_ID
    client.set_callback(None)
    client.subscribe(cmd_topic.encode(), qos=0)
    log("listening on %s" % cmd_topic)

    def set_buzzer(on):
        buzzer.value(1 if on else 0)
        log("buzzer %s" % ("ON" if on else "OFF"))

    def on_command(topic, msg):
        text = msg.decode()
        log("<- %s %s" % (topic.decode(), text))
        try:
            command = json.loads(text)
            on = bool(command.get("on", False))
        except ValueError:
            on = text.strip().lower() in ("on", "true", "1")
        set_buzzer(on)
        # Ack back to the server (handleBuzzerStatus just marks the actuator seen).
        client.publish(
            actuator_status_topic().encode(),
            dumps({"state": "ack", "command": "on" if on else "off"}).encode(),
            qos=0,
        )

    client.set_callback(on_command)
    while True:
        client.wait_msg()  # blocks until a command arrives; reconnects via robust


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
    """Create a session and run the role until the connection breaks."""
    client = make_client()
    publish_online(client)
    ROLE_RUNNERS[config.ROLE](client)


def main():
    log("firmware starting: role=%s id=%s" % (config.ROLE, config.DEVICE_ID))
    connect_wifi()
    sync_clock()

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
