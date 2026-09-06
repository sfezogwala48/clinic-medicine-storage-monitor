# mqtt-tester

MQTT test client for the clinic medicine storage monitor, speaking the exact
firmware stack: MicroPython `umqtt.robust` over `umqtt.simple` (both vendored
under `umqtt/`, pinned to upstream `0400c568` — the last version before the
unverified July-2026 VBI refactor).

## Run with uv (no dependencies to install — stdlib only)

```bash
cd mqtt-tester
uv run tester.py --help
uv run tester.py burst --device SEN001 --interval 5 --count 4
uv run tester.py storage --device FRIDGE-01 --temp 4.2 --humidity 38
uv run tester.py door --sensor SEN005 --open
uv run tester.py status --sensor SEN001 --offline
uv run tester.py actuator --id ACT001   # subscribe buzzer commands, ack them
```

Point at another broker with `--broker <host> --port 1883`.

## How it maps to the stack

Topics mirror `server/src/mqtt/mqtt.options.ts`. On CPython, `shim.py`
adds MicroPython's stream-style `socket.read`/`socket.write` so the
vendored files run unmodified; on real MicroPython hardware, drop `shim.py`
(and this README's uv parts) and run `tester.py` as-is.

## Workspace note

`package.json` only exists so the pnpm workspace keeps resolving this
member; the scripts delegate to uv:

```bash
vp run mqtt-tester#burst   # from the repo root
```
