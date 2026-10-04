# Pico W Firmware

Generic MicroPython firmware for Raspberry Pi Pico W devices reporting to the
clinic medicine storage monitor. The same code runs as any of the four device
types — pick a role in `config.py` and flash one Pico per device.

| Role      | Hardware                          | Publishes to                                                                               |
| --------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| `storage` | DHT22/DHT11 on a fridge/freezer   | `clinic/storage/<id>/telemetry`                                                            |
| `climate` | DHT22/DHT11 ambient sensor        | `clinic/sensors/<id>/telemetry/climate`                                                    |
| `door`    | Reed switch on a unit door        | `clinic/sensors/<id>/telemetry/door`                                                       |
| `buzzer`  | Active buzzer / siren (GPIO HIGH) | subscribes `clinic/actuators/<id>/commands/buzzer`, acks on `clinic/actuators/<id>/status` |

Topics and payloads match `server/src/mqtt/mqtt.options.ts` and
`notification.dto.ts` exactly, and it runs the same vendored `umqtt` stack as
`mqtt-tester/` (so `mqtt-tester` output and device output are identical).

## Files

```
firmware/
├── config.py        # <-- the only file you edit (WiFi, broker, role, pins, IDs)
├── main.py          # role logic + WiFi/MQTT reconnect loop
├── net.py           # WiFi, NTP clock sync, ISO-UTC timestamp helper
├── sdlog.py         # microSD history log + offline backlog (uses sdcard.py)
├── sdcard.py        # SPI microSD driver
├── ssd1306.py       # OLED driver (storage role)
└── umqtt/           # vendored MicroPython MQTT client (same as mqtt-tester/umqtt)
    ├── simple.py
    └── robust.py
```

## 1. Flash MicroPython

1. Download the latest **Pico W** MicroPython UF2 from
   https://micropython.org/download/RPI_PICO_W/ (v1.23 or newer).
2. Hold the **BOOTSEL** button, plug the Pico in via USB, release the button.
   It appears as a USB mass-storage drive.
3. Drag the UF2 onto the drive. The Pico reboots running MicroPython.

## 2. Configure

Edit `firmware/config.py`:

- `ROLE` — `storage`, `climate`, `door`, or `buzzer`
- `DEVICE_ID` — identity shown on the dashboard (e.g. `FRIDGE-01`, `SEN003`, `ACT001`)
- `WIFI_SSID` / `WIFI_PASSWORD`
- `MQTT_BROKER` — the LAN IP of the machine running the `server/` container
  (**not** `localhost`), port `1883` to match `compose.yaml`
- Pin numbers in the Sensors/actuators section if you deviate from the defaults

Defaults: DHT data on **GP15**, reed switch on **GP14**, buzzer on **GP13**.
All sensors wire to GND (with internal pull-ups where applicable); DHT data
wires to 3V3 and GP15, ideally with a 4.7k–10k pull-up.

## 3. Copy to the Pico

From the repo root, with the Pico plugged in:

```bash
uvx mpremote cp firmware/config.py firmware/net.py firmware/main.py :
uvx mpremote cp -r firmware/umqtt :/umqtt
uvx mpremote reset
```

Or use Thonny's file transfer, or drag the files onto the `RPI-RP2`-mounted
board using `ampy`/`rshell` — any MicroPython file-transfer tool works.

> `config.py` sits on the device next to `main.py`; keep one Pico per role/ID
> (each needs its own edited `config.py`).

## 4. Run

The firmware starts automatically on power-up (MicroPython runs `main.py`).
The onboard LED blinks twice after a successful MQTT connect.

Watch the console:

```bash
uvx mpremote
```

## Behavior

- **Timestamps**: the Pico's clock is synced via NTP (`ntptime`) at boot, so
  `recordedAt` is real UTC in the `2026-01-31T12:00:00Z` format the server ingests.
- **Presence**: sensor roles publish a retained `{"online": true}` to
  `clinic/sensors/<id>/status` on connect and register a retained
  `{"online": false}` last-will, so the dashboard shows offline when a device
  dies without anyone publishing.
- **Door**: events publish immediately on open/close (80 ms debounce) plus a
  heartbeat every `DOOR_HEARTBEAT_S` (5 min) so a silent door is never stale.
- **Buzzer**: parses `{actuatorId, on, alertId?, pattern?}` from the server's
  `NotificationsService` and drives `BUZZER_PIN`. Alerts use `pattern: "beep"`
  (pulses of `BUZZER_BEEP_ON_MS` / `BUZZER_BEEP_OFF_MS`); only an explicit
  `"continuous"` gives a solid tone, and `on: false` silences it. Publishes an
  ack to `clinic/actuators/<id>/status` per command. The standalone `buzzer`
  role is force-silenced if the connection drops. With `STORAGE_HAS_BUZZER`
  the `storage` role drives the buzzer itself: it subscribes to
  `clinic/actuators/<ACTUATOR_ID>/commands/buzzer`, announces itself on the
  actuator status topic so the server registers it as a buzzer at its
  location, and keeps sampling while it beeps.
- **Resilience**: the buzzer uses `umqtt.robust` for MQTT-level reconnects; if
  WiFi itself drops, `main()` re-associates and rebuilds the session. No reset
  needed.
- **SD card** (`SD_ENABLED`, SPI0 pins in `config.py`; optional, the firmware
  runs without a card): sensor roles append every reading to
  `SD_LOG_FILE` (CSV: `recordedAtLocal,source,temperatureC,humidityPct,doorOpen`, with
  local time such as `2026-01-31T14:00:05+02:00`).
  While the link is down they keep sampling and queue the unsent messages in
  `SD_BACKLOG_FILE`; after reconnecting they replay the backlog oldest-first
  (`SD_REPLAY_BATCH` rows per cycle) with their original `recordedAt`, then
  resume live publishing. Replay progress is saved, so a reboot mid-replay
  does not resend rows. Neither file is trimmed automatically.
- **Limits**: the clock is only set by NTP at boot, so the device must have
  WiFi when it starts (outages _after_ boot are covered). Messages are QoS 0,
  so a reading sent in the moment the link dies can still be lost.

## Testing end-to-end

```bash
vp run dev                       # API :3000 + UI :5173 (+ mosquitto if in compose)
# power the Pico, then watch it arrive:
uv run --project mqtt-tester tester.py burst --device SEN001 --count 4
```
