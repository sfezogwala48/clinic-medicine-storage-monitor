"""Publish a backfilled climate history so charts and alerts have data.

Sends ``clinic/sensors/<id>/telemetry/climate`` samples spread backwards over
the last N hours using historical ``recordedAt`` values, with a sine-wave
humidity/temperature profile. The final samples of every run are pushed above
the humidity alert band so the server raises "Humidity Out of Range".

Examples:
  uv run seed_climate.py                          # 48 samples over 24h, SEN001+SEN002
  uv run seed_climate.py --sensor SEN003 --count 24 --hours 12
"""

import argparse
import json
import math
import sys
import time

import shim  # noqa: F401  (installs CPython socket compatibility first)
from umqtt.robust import MQTTClient

QOS = 0


def iso_ago(seconds_ago):
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - seconds_ago))


def profile(i, count):
    """(temp °C, humidity %) for sample i of count — in-band except the tail."""
    phase = 2 * math.pi * i / max(count - 1, 1)
    temp = round(5.0 + 2.0 * math.sin(phase), 1)  # 3.0–7.0 °C: inside fridge band
    humidity = round(45.0 + 10.0 * math.sin(phase + math.pi / 4), 1)  # 35–55 %RH
    if i >= count - 3:  # recent excursion above the 30–60 % alert band
        humidity = round(62.0 + (i - (count - 3)) * 2.0, 1)  # 62, 64, 66 %RH
    return temp, humidity


def seed_sensor(client, sensor, count, hours):
    span = hours * 3600
    for i in range(count):
        seconds_ago = int(span * (count - 1 - i) / max(count - 1, 1))
        temp, humidity = profile(i, count)
        payload = {
            "sensorId": sensor,
            "temp": temp,
            "humidity": humidity,
            "recordedAt": iso_ago(seconds_ago),
        }
        topic = "clinic/sensors/%s/telemetry/climate" % sensor
        body = json.dumps(payload)
        client.publish(topic.encode(), body.encode(), qos=QOS)
        print("-> %s %s" % (topic, body))
        time.sleep(0.05)
    print("%s: %d samples over %dh (tail humidity out of band)" % (sensor, count, hours))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--broker", default="localhost")
    parser.add_argument("--port", type=int, default=1883)
    parser.add_argument("--client-id", default="seed-climate")
    parser.add_argument("--sensor", action="append", dest="sensors")
    parser.add_argument("--count", type=int, default=48, help="samples per sensor")
    parser.add_argument("--hours", type=int, default=24, help="backfill window")
    args = parser.parse_args(argv)
    sensors = args.sensors or ["SEN001", "SEN002"]

    client = MQTTClient(args.client_id, args.broker, args.port)
    client.DEBUG = False
    client.connect()
    try:
        for sensor in sensors:
            seed_sensor(client, sensor, args.count, args.hours)
    finally:
        client.disconnect()
    return 0


if __name__ == "__main__":
    sys.exit(main())
