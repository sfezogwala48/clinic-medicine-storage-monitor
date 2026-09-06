"""MQTT test client for the clinic medicine storage monitor.

Simulates storage devices, climate/door sensors and actuators using the
exact MicroPython ``umqtt`` stack that runs on the real firmware
(``umqtt/robust.py`` over ``umqtt/simple.py``, both vendored). On CPython,
``shim.py`` provides MicroPython's stream-style socket API; on real
MicroPython hardware, drop ``shim`` and run this file unchanged.

Topics mirror ``server/src/mqtt/mqtt.options.ts``:
  clinic/storage/<device>/telemetry          storage readings
  clinic/sensors/<sensor>/telemetry/climate  climate readings
  clinic/sensors/<sensor>/telemetry/door     door open/closed
  clinic/sensors/<sensor>/status              sensor online/offline
  clinic/actuators/<id>/commands/buzzer       server -> actuator (subscribe)
  clinic/actuators/<id>/status                actuator acks (publish)

Examples:
  uv run tester.py burst --device SEN001 --interval 5
  uv run tester.py storage --device FRIDGE-01 --temp 4.2 --humidity 38 --loop
  uv run tester.py door --sensor SEN005 --open
  uv run tester.py actuator --id ACT001
"""

import argparse
import json
import sys
import time

import shim  # noqa: F401  (installs CPython socket compatibility first)
from umqtt.robust import MQTTClient

QOS = 0


def make_client(broker, port, client_id):
    client = MQTTClient(client_id, broker, port)
    client.DEBUG = True
    client.connect()
    return client


def publish(client, topic, payload, retain=False):
    body = json.dumps(payload)
    client.publish(topic.encode(), body.encode(), retain=retain, qos=QOS)
    print("-> %s %s" % (topic, body))


def cmd_storage(args):
    client = make_client(args.broker, args.port, args.client_id)
    try:
        while True:
            publish(
                client,
                "clinic/storage/%s/telemetry" % args.device,
                {
                    "deviceId": args.device,
                    "temperatureC": args.temp,
                    "humidityPct": args.humidity,
                    "recordedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
            )
            if not args.loop:
                break
            time.sleep(args.interval)
    finally:
        client.disconnect()


def cmd_climate(args):
    client = make_client(args.broker, args.port, args.client_id)
    try:
        while True:
            publish(
                client,
                "clinic/sensors/%s/telemetry/climate" % args.sensor,
                {
                    "sensorId": args.sensor,
                    "temp": args.temp,
                    "humidity": args.humidity,
                },
            )
            if not args.loop:
                break
            time.sleep(args.interval)
    finally:
        client.disconnect()


def cmd_door(args):
    client = make_client(args.broker, args.port, args.client_id)
    try:
        publish(
            client,
            "clinic/sensors/%s/telemetry/door" % args.sensor,
            {"sensorId": args.sensor, "containerOpen": args.open},
        )
    finally:
        client.disconnect()


def cmd_status(args):
    client = make_client(args.broker, args.port, args.client_id)
    try:
        publish(
            client,
            "clinic/sensors/%s/status" % args.sensor,
            {"online": args.online},
        )
    finally:
        client.disconnect()


def cmd_actuator(args):
    received = []

    def on_buzzer(topic, msg):
        print("<- %s %s" % (topic.decode(), msg.decode()))
        received.append((topic, msg))
        client.publish(
            ("clinic/actuators/%s/status" % args.id).encode(),
            json.dumps({"state": "ack", "command": msg.decode()}),
        )
        print("-> acked buzzer command for %s" % args.id)

    client = make_client(args.broker, args.port, args.client_id)
    client.set_callback(on_buzzer)
    topic = "clinic/actuators/%s/commands/buzzer" % args.id
    client.subscribe(topic.encode(), qos=QOS)
    print("listening on %s (Ctrl-C to stop)" % topic)
    try:
        while True:
            client.wait_msg()
    except KeyboardInterrupt:
        pass
    finally:
        client.disconnect()
    return received


def cmd_burst(args):
    """Loop storage + climate + door traffic for one demo device set."""
    client = make_client(args.broker, args.port, args.client_id)
    temp = args.temp
    try:
        n = 0
        while args.count == 0 or n < args.count:
            temp = round(temp + (0.4 if n % 2 == 0 else -0.3), 1)
            publish(
                client,
                "clinic/storage/%s/telemetry" % args.device,
                {
                    "deviceId": args.device,
                    "temperatureC": temp,
                    "humidityPct": args.humidity,
                    "recordedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
            )
            publish(
                client,
                "clinic/sensors/%s/telemetry/climate" % args.device,
                {"sensorId": args.device, "temp": temp, "humidity": args.humidity},
            )
            n += 1
            time.sleep(args.interval)
    except KeyboardInterrupt:
        pass
    finally:
        client.disconnect()


def build_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--broker", default="localhost")
    parser.add_argument("--port", type=int, default=1883)
    parser.add_argument("--client-id", default="mqtt-tester")
    parser.add_argument("--interval", type=float, default=5.0)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("storage", help="publish a storage reading")
    p.add_argument("--device", default="SEN001")
    p.add_argument("--temp", type=float, default=4.2)
    p.add_argument("--humidity", type=float, default=42.0)
    p.add_argument("--loop", action="store_true")
    p.add_argument("--interval", type=float, default=argparse.SUPPRESS)
    p.set_defaults(func=cmd_storage)

    p = sub.add_parser("climate", help="publish a climate reading")
    p.add_argument("--sensor", default="SEN001")
    p.add_argument("--temp", type=float, default=4.2)
    p.add_argument("--humidity", type=float, default=42.0)
    p.add_argument("--loop", action="store_true")
    p.add_argument("--interval", type=float, default=argparse.SUPPRESS)
    p.set_defaults(func=cmd_climate)

    p = sub.add_parser("door", help="publish a door event")
    p.add_argument("--sensor", default="SEN005")
    group = p.add_mutually_exclusive_group()
    group.add_argument("--open", dest="open", action="store_true")
    group.add_argument("--closed", dest="open", action="store_false")
    p.set_defaults(func=cmd_door, open=True)

    p = sub.add_parser("status", help="publish a sensor online/offline status")
    p.add_argument("--sensor", default="SEN001")
    group = p.add_mutually_exclusive_group()
    group.add_argument("--online", dest="online", action="store_true")
    group.add_argument("--offline", dest="online", action="store_false")
    p.set_defaults(func=cmd_status, online=True)

    p = sub.add_parser("actuator", help="simulate a buzzer actuator (subscribe + ack)")
    p.add_argument("--id", default="ACT001")
    p.set_defaults(func=cmd_actuator)

    p = sub.add_parser("burst", help="loop demo traffic for a device set")
    p.add_argument("--device", default="SEN001")
    p.add_argument("--temp", type=float, default=4.2)
    p.add_argument("--humidity", type=float, default=42.0)
    p.add_argument("--count", type=int, default=0, help="messages per topic, 0 = forever")
    p.add_argument("--interval", type=float, default=argparse.SUPPRESS)
    p.set_defaults(func=cmd_burst)

    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
