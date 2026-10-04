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
SENSOR_ID = DEVICE_ID  # used by climate/door roles
ACTUATOR_ID = DEVICE_ID  # used by the buzzer role

# ---------------------------------------------------------------------------
# WiFi (Pico W onboard CYW43 radio)
# ---------------------------------------------------------------------------
WIFI_SSID = ""
WIFI_PASSWORD = ""

# ---------------------------------------------------------------------------
# MQTT broker (the NestJS server subscribes here; defaults match compose.yaml)
# ---------------------------------------------------------------------------
MQTT_BROKER = ""  # IP of the machine running `server/` (not "localhost"!)
MQTT_PORT = 1883
# Server HTTP API used to fetch the real UTC time (GET /health/time). The Pico's
# clock is lost on every power cycle and NTP is often blocked on guest WiFi.
TIME_API_HOST = MQTT_BROKER  # change if the API runs on a different host
TIME_API_PORT = 3000
CLOCK_RESYNC_S = 86400  # re-sync this often once synced
CLOCK_RETRY_S = 60  # retry this often while unsynced

# The RTC always holds UTC and everything sent to the server is UTC. This
# offset is only applied to what people read on the device: the OLED, console
# log stamps and the SD CSV history. South Africa is UTC+2 year-round (no DST).
LOCAL_UTC_OFFSET_H = 2

MQTT_USER = None  # set to a string if mosquitto requires auth
MQTT_PASSWORD = None

# Keepalive in seconds. umqtt does not send automatic PINGREQs, so 0 (disabled)
# is the safe default; the broker will not age the connection out.
MQTT_KEEPALIVE = 0

# Socket timeout for the sensor roles, so a dead link raises OSError (and the
# reading goes to the SD backlog) instead of hanging. Not used by the buzzer,
# which blocks waiting for commands.
MQTT_SOCKET_TIMEOUT_S = 10

# ---------------------------------------------------------------------------
# Sensors / actuators (GPIO pins, BCM numbering)
# ---------------------------------------------------------------------------
# DHT22 (AM2302) or DHT11 temperature + humidity sensor. Used by the
# "storage" and "climate" roles.
SENSOR_TYPE = "dht22"  # "dht22" | "dht11"
DHT_PIN = 28  # data pin; 4.7k-10k pull-up between DATA and 3V3

# Reed / magnetic door switch for the "door" role. Wire the switch between
# the pin and GND; the internal pull-up keeps the pin HIGH while the door is
# open (magnet away, switch open).
DOOR_PIN = 3
DOOR_CLOSED_WHEN_LOW = True  # switch closed (LOW) = door closed. Flip if yours differs.
DOOR_DEBOUNCE_MS = 80
DOOR_HEARTBEAT_S = 300  # re-publish current state this often even if unchanged

# Active buzzer (or relay driving a siren). HIGH = sounding. Used by the
# "buzzer" role, and by the "storage" role when STORAGE_HAS_BUZZER is set.
BUZZER_PIN = 4
STORAGE_HAS_BUZZER = True  # storage Pico drives its own buzzer from server commands
# Alert pattern "beep": on/off pulses. Pattern "continuous" is one solid tone.
BUZZER_BEEP_ON_MS = 250
BUZZER_BEEP_OFF_MS = 250

# SSD1306 OLED (128x64) local display, I2C0.
OLED_SDA_PIN = 0
OLED_SCL_PIN = 1
OLED_I2C_FREQ = 400000
OLED_ADDR = 0x3C

# microSD card (SPI0): CSV history of every reading, plus a backlog of
# publishes that could not be sent while offline (replayed on reconnect).
# With no card inserted the firmware carries on without it.
SD_ENABLED = True
SD_MISO_PIN = 16
SD_CS_PIN = 17
SD_SCK_PIN = 18
SD_MOSI_PIN = 19
SD_MOUNT_PATH = "/sd"
SD_LOG_FILE = "/sd/telemetry.csv"
SD_BACKLOG_FILE = "/sd/backlog.txt"
SD_REPLAY_BATCH = 200  # backlog rows re-sent per cycle while catching up

# ---------------------------------------------------------------------------
# Timing
# ---------------------------------------------------------------------------
READ_INTERVAL_S = 10  # seconds between telemetry publishes
WIFI_TIMEOUT_S = 20
RECONNECT_DELAY_S = 5
