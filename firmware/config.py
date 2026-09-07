"""Device configuration for the clinic medicine storage monitor firmware.

Edit this file only. Everything else (main.py, net.py, umqtt/) is generic.

Set ROLE to one of:
  "storage"  - fridge/freezer unit sensor (DHT22/DHT11) -> clinic/storage/<id>/telemetry
  "climate"  - ambient climate sensor (DHT22/DHT11)    -> clinic/sensors/<id>/telemetry/climate
  "door"     - reed switch on a storage unit door       -> clinic/sensors/<id>/telemetry/door
  "buzzer"   - alarm buzzer actuator (server-controlled) -> subscribes to clinic/actuators/<id>/commands/buzzer

Flash MicroPython on a Raspberry Pi Pico W first (see README.md).
"""

# ---------------------------------------------------------------------------
# Role / identity
# ---------------------------------------------------------------------------
# "storage" | "climate" | "door" | "buzzer"
ROLE = "storage"

# Device / sensor ID as shown on the dashboard. One firmware = one identity.
# Examples: "FRIDGE-01", "SEN003", "ACT001"
DEVICE_ID = "FRIDGE-01"
SENSOR_ID = DEVICE_ID          # used by climate/door roles
ACTUATOR_ID = DEVICE_ID        # used by the buzzer role

# ---------------------------------------------------------------------------
# WiFi (Pico W onboard CYW43 radio)
# ---------------------------------------------------------------------------
WIFI_SSID = "YOUR_WIFI_SSID"
WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"

# ---------------------------------------------------------------------------
# MQTT broker (the NestJS server subscribes here; defaults match compose.yaml)
# ---------------------------------------------------------------------------
MQTT_BROKER = "192.168.1.10"   # IP of the machine running `server/` (not "localhost"!)
MQTT_PORT = 1883
MQTT_USER = None               # set to a string if mosquitto requires auth
MQTT_PASSWORD = None

# Keepalive in seconds. umqtt does not send automatic PINGREQs, so 0 (disabled)
# is the safe default; the broker will not age the connection out.
MQTT_KEEPALIVE = 0

# ---------------------------------------------------------------------------
# Sensors / actuators (GPIO pins, BCM numbering)
# ---------------------------------------------------------------------------
# DHT22 (AM2302) or DHT11 temperature + humidity sensor. Used by the
# "storage" and "climate" roles.
SENSOR_TYPE = "dht22"          # "dht22" | "dht11"
DHT_PIN = 15                   # data pin; 4.7k-10k pull-up between DATA and 3V3

# Reed / magnetic door switch for the "door" role. Wire the switch between
# the pin and GND; the internal pull-up keeps the pin HIGH while the door is
# open (magnet away, switch open).
DOOR_PIN = 14
DOOR_CLOSED_WHEN_LOW = True    # switch closed (LOW) = door closed. Flip if yours differs.
DOOR_DEBOUNCE_MS = 80
DOOR_HEARTBEAT_S = 300         # re-publish current state this often even if unchanged

# Active buzzer (or relay driving a siren) for the "buzzer" role.
# HIGH = sounding.
BUZZER_PIN = 13

# ---------------------------------------------------------------------------
# Timing
# ---------------------------------------------------------------------------
READ_INTERVAL_S = 10           # seconds between telemetry publishes
WIFI_TIMEOUT_S = 20
RECONNECT_DELAY_S = 5
