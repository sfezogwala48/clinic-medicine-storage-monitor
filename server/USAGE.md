# Client Usage Guide

How to talk to the Clinic Medicine Storage Monitor server — over **MQTT** (IoT devices) and **HTTP** (dashboards/apps).

## Basics

|                  |                                                 |
| ---------------- | ----------------------------------------------- |
| HTTP base URL    | `http://<host>:3000` (see `PORT` in `.env`)     |
| API prefix       | All UI endpoints live under `/api/...`          |
| MQTT broker      | `mqtt://<host>:1883` (see `MQTT_URL` in `.env`) |
| OpenAPI JSON     | `GET /openapi.json`                             |
| Interactive docs | `GET /reference` (Scalar UI)                    |

Auth is credential-based (JWT): `POST /api/auth/login` with `{"identifier": "<contact-or-name>", "password": "..."}` returns `{token, user}`. Pass an optional `"role"` when the client pre-selected a user type — the account must belong to it. Pass it as `Authorization: Bearer <token>` on every `/api/*` request — unauthenticated calls get `401`. Tokens expire after `JWT_EXPIRES_IN` (default `12h`); signing secret is `JWT_SECRET`. Seeded demo accounts (override with `SEED_<ROLE>_PASSWORD` before first boot): `admin@clinic.co.za` / `Admin123!`, `+27721111111` (supervisor) / `Supervisor123!`, `+27730000000` (staff) / `Staff123!`. Public without a token: `/health*`, `/openapi.json`, `/reference`, `/telemetry/*` (devices), and `POST /api/auth/login`.

---

## 1. MQTT — for devices/firmware

### Topics

**Sensors publish (device → server):**

| Topic                                         | Purpose                                 | QoS         |
| --------------------------------------------- | --------------------------------------- | ----------- |
| `clinic/sensors/{sensorId}/telemetry/climate` | Temp/humidity sample                    | 1           |
| `clinic/sensors/{sensorId}/telemetry/door`    | Door open/closed sample                 | 1           |
| `clinic/sensors/{sensorId}/status`            | Online/offline (use as LWT)             | 1, retained |
| `clinic/storage/{deviceId}/telemetry`         | Legacy alias, climate only (deprecated) | 1           |

**Server publishes (server → device):**

| Topic                                           | Purpose                                        |
| ----------------------------------------------- | ---------------------------------------------- |
| `clinic/actuators/{actuatorId}/commands/buzzer` | Buzzer on/off commands                         |
| `clinic/actuators/all/config/thresholds`        | Threshold snapshot after `PUT /api/thresholds` |

**Actuators publish (device → server):**

| Topic                                  | Purpose              |
| -------------------------------------- | -------------------- |
| `clinic/actuators/{actuatorId}/status` | Buzzer heartbeat/ack |

Sensor IDs look like `SEN001`; buzzer IDs like `BUZ-A`. A buzzer serves all sensors sharing its `location` (e.g. `Medicine Storage Room A`) — no per-sensor addressing needed.

### Payloads

**Climate** (`.../telemetry/climate`) — `sensorId` optional, falls back to the topic:

```json
{ "sensorId": "SEN002", "temp": 5.2, "humidity": 55, "recordedAt": "2026-09-06T08:15:00.000Z" }
```

- `temp`: −30…80 °C, `humidity`: 0…100 %. Omit `recordedAt` to use server time.
- Ack: `{ "received": true, "deviceId": "SEN002" }` or `{ "received": false, "error": "..." }`.

**Door** (`.../telemetry/door`):

```json
{ "sensorId": "SEN005", "containerOpen": true }
```

Each sample becomes an access-log event; open→close pairs compute the open duration.

**Status** (`.../status`, recommended as LWT):

```json
{ "online": true }
```

`{ "online": false }` (or the LWT firing) marks the sensor `Inactive`, which feeds `systemStatus` in the dashboard summary.

**Buzzer command** (what your actuator receives):

```json
{ "actuatorId": "BUZ-A", "on": true, "alertId": "ALT...", "pattern": "continuous" }
```

`on: false` means silence (sent when an alert is acknowledged).

### Example (Python, `paho-mqtt`)

```python
import json, paho.mqtt.client as mqtt

c = mqtt.Client()
c.will_set("clinic/sensors/SEN002/status", json.dumps({"online": False}), qos=1, retain=True)
c.connect("localhost", 1883)
c.publish("clinic/sensors/SEN002/status", json.dumps({"online": True}), qos=1, retain=True)
c.publish("clinic/sensors/SEN002/telemetry/climate",
          json.dumps({"temp": 5.2, "humidity": 55}), qos=1)
c.subscribe("clinic/actuators/BUZ-A/commands/buzzer")  # if this unit also drives a buzzer
c.loop_forever()
```

Thresholds that trigger alerts (defaults, change via `PUT /api/thresholds`): fridge 2–8 °C, room max 25 °C, humidity 30–60 %, door-open limit 5 min.

---

## 2. HTTP — for frontend/apps

All responses are JSON. Timestamps are **ISO-8601** — format them in the UI (`Alert.time`, `AccessEvent.time`, `User.lastLogin`); durations arrive pre-formatted (`"5m"`, `"-"` for close events).

### Reference

| Method         | Path                                               | Notes                                                                                                                                                      |
| -------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`         | `/api/auth/login`                                  | Body `{"identifier":"admin@clinic.co.za","password":"..."}` → `{token, user}` (JWT, `12h`)                                                                 |
| `GET`          | `/api/auth/me`                                     | Current user from the Bearer token                                                                                                                         |
| `POST`         | `/api/auth/change-password`                        | Body `{"currentPassword":"...","newPassword":"..."}` (min 8 chars)                                                                                         |
| `GET`          | `/api/dashboard/summary`                           | Avg temp/humidity, alert counts, `systemStatus`, `lastSync`                                                                                                |
| `GET`          | `/api/temperature-trend?sensorId=SEN001&range=24h` | `range`: `24h` or `7d` → `{unit:"°C", intervalMinutes, limit, points[]}`                                                                                   |
| `GET`          | `/api/sensors`                                     | Optional `?type=Temp/Humidity` `&status=Active`                                                                                                            |
| `GET`          | `/api/readings`                                    | Latest reading per sensor; each has **either** `temp`/`humidity` **or** `containerOpen`, plus `status` (Normal/Warning/Critical) and active `alerts` count |
| `GET`          | `/api/access-log?limit=3`                          | Newest first, `limit` 1–200                                                                                                                                |
| `GET`          | `/api/alerts?status=Active`                        | Omit query for all                                                                                                                                         |
| `PATCH`        | `/api/alerts/:id/acknowledge`                      | → Resolved + silences buzzers at that location                                                                                                             |
| `GET`          | `/api/notifications?alertId=ALT...`                | SMS + Buzzer dispatch log                                                                                                                                  |
| `GET`          | `/api/reports/summary`                             | Compliance score, access total, waste prevented                                                                                                            |
| `GET`          | `/api/reports`                                     | Archive `[{name, size, downloadUrl}]`                                                                                                                      |
| `GET`          | `/api/reports/:name`                               | File download                                                                                                                                              |
| `GET` / `PUT`  | `/api/thresholds`                                  | `{fridgeMin, fridgeMax, roomMax, doorOpenLimitMin}`                                                                                                        |
| `GET` / `PUT`  | `/api/notification-settings`                       | `{smsEnabled, buzzerEnabled, emailEnabled, recipients[]}`                                                                                                  |
| `GET` / `POST` | `/api/users`                                       | Create (admin only) defaults to `staff`; optional `password`, else a `temporaryPassword` is returned once                                                  |
| `GET`          | `/api/audit-trail?limit=100`                       | Newest first                                                                                                                                               |

Legacy simulator endpoints (kept for testing): `GET /telemetry/latest`, `POST /telemetry/publish` (publishes via MQTT and waits for the ingest ack — needs a reachable broker).

### curl examples

```bash
BASE=http://localhost:3000

TOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -d '{"identifier":"admin@clinic.co.za","password":"Admin123!"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
AUTH="Authorization: Bearer $TOKEN"
curl -s $BASE/api/dashboard/summary -H "$AUTH"
curl -s "$BASE/api/temperature-trend?sensorId=SEN001&range=24h" -H "$AUTH"
curl -s "$BASE/api/alerts?status=Active" -H "$AUTH"
curl -s -X PATCH $BASE/api/alerts/ALT001/acknowledge -H "$AUTH"
curl -s -X PUT $BASE/api/thresholds -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"fridgeMin":2,"fridgeMax":8,"roomMax":25,"doorOpenLimitMin":5}'
curl -s -X POST $BASE/api/users -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Nurse Khumalo","password":"Nurse123!"}'
```

Errors are standard Nest shapes: `400` validation, `404` unknown alert/report, `503` MQTT ack timeout on `/telemetry/publish`.

---

## 3. Seeded demo data

First boot seeds: sensors `SEN001–SEN004` (climate) + `SEN005–SEN006` (door), buzzers `BUZ-A` / `BUZ-VAC`, default thresholds/settings, 3 users, 1 sample report. Send telemetry (or poll the endpoints above) to populate readings, alerts, access events, and the dashboard.

## 4. Troubleshooting

- **Empty readings/dashboard zeros** → no telemetry received yet; check the broker is up (`GET /health/ready` reports `mqtt: up`) and devices publish to the exact topics above.
- **`503` on `/telemetry/publish`** → broker unreachable (`MQTT_URL`).
- **No buzzer command** → `buzzerEnabled` must be true in notification settings, and an `Active` actuator must share the alerting sensor's `location`.
