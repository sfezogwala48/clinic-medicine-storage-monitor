"""WiFi / clock helpers for the clinic medicine storage monitor firmware.

MicroPython for Raspberry Pi Pico W. Kept separate from main.py so the role
logic stays readable.
"""

import time

import config


def connect_wifi():
    """Connect (or verify the connection) and return the WLAN object.

    Raises OSError on timeout so callers can retry after config.RECONNECT_DELAY_S.
    """
    import network

    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("wifi: connecting to %r ..." % config.WIFI_SSID)
        wlan.disconnect()
        wlan.connect(config.WIFI_SSID, config.WIFI_PASSWORD)
        deadline = time.time() + config.WIFI_TIMEOUT_S
        while not wlan.isconnected():
            if time.time() > deadline:
                raise OSError("wifi: could not connect within %ds" % config.WIFI_TIMEOUT_S)
            time.sleep(0.25)
    print("wifi: connected, ip=%s" % wlan.ifconfig()[0])
    return wlan


def wifi_ok():
    import network

    return network.WLAN(network.STA_IF).isconnected()


def wifi_nudge():
    """Start re-associating without waiting for it; poll wifi_ok() later."""
    import network

    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected() and wlan.status() != network.STAT_CONNECTING:
        wlan.connect(config.WIFI_SSID, config.WIFI_PASSWORD)


_synced = False
_last_attempt = None


def clock_synced():
    return _synced


def clock_due():
    """True when the clock should be (re)synced: retry soon if never synced, daily after."""
    if _last_attempt is None:
        return True
    wait = config.CLOCK_RESYNC_S if _synced else config.CLOCK_RETRY_S
    return time.ticks_diff(time.ticks_ms(), _last_attempt) > wait * 1000


def _set_rtc(year, month, day, hour, minute, second):
    import machine

    # Round-trip through mktime/gmtime to get the weekday, like ntptime does.
    tm = time.gmtime(time.mktime((year, month, day, hour, minute, second, 0, 0)))
    machine.RTC().datetime((tm[0], tm[1], tm[2], tm[6] + 1, tm[3], tm[4], tm[5], 0))


def _server_time():
    """Server UTC via GET /health/time as a (y, m, d, h, mi, s) tuple.

    Plain TCP, so it works on networks that block NTP's UDP port 123.
    """
    import json
    import socket

    addr = socket.getaddrinfo(config.TIME_API_HOST, config.TIME_API_PORT)[0][-1]
    sock = socket.socket()
    try:
        sock.settimeout(5)
        sock.connect(addr)
        sock.send(
            b"GET /health/time HTTP/1.0\r\nHost: %s\r\nConnection: close\r\n\r\n"
            % config.TIME_API_HOST.encode()
        )
        reply = b""
        while True:
            chunk = sock.recv(256)
            if not chunk:
                break
            reply += chunk
    finally:
        sock.close()
    head, _, body = reply.partition(b"\r\n\r\n")
    if b" 200 " not in head.split(b"\r\n")[0]:
        raise OSError("time api: %r" % head[:40])
    stamp = json.loads(body)["utc"]  # 2026-01-31T12:00:00Z
    parts = (int(stamp[0:4]), int(stamp[5:7]), int(stamp[8:10]),
             int(stamp[11:13]), int(stamp[14:16]), int(stamp[17:19]))
    if parts[0] < 2024:
        raise OSError("time api: implausible %s" % stamp)
    return parts


def sync_clock(attempts=3):
    """Set the RTC to real UTC; return True on success.

    Tries the server first (GET /health/time over TCP), then NTP. NTP alone is
    not enough: guest WiFi often blocks UDP 123, and without a sync the Pico
    keeps whatever time it was last given (USB tools set *local* time), which
    makes every `recordedAt` wrong. While unsynced, iso_utc() returns None so
    the server stamps arrival time instead of trusting a bad clock.
    """
    global _synced, _last_attempt
    _last_attempt = time.ticks_ms()
    for attempt in range(attempts):
        try:
            _set_rtc(*_server_time())
            _synced = True
            print("clock: synced from %s (%s)" % (config.TIME_API_HOST, iso_utc()))
            return True
        except Exception as e:
            print("clock: server sync attempt %d failed: %r" % (attempt + 1, e))
        try:
            import ntptime

            ntptime.settime()
            _synced = True
            print("clock: NTP sync ok (%s)" % iso_utc())
            return True
        except Exception as e:  # DNS/DHCP can lag right after boot
            print("clock: NTP attempt %d failed: %r" % (attempt + 1, e))
        time.sleep(2)
    return False


def iso_utc():
    """UTC timestamp in the exact format the server ingests: 2026-01-31T12:00:00Z.

    None until the clock has been synced, so callers never publish a made-up time.
    """
    if not _synced:
        return None
    t = time.gmtime()
    return "%04d-%02d-%02dT%02d:%02d:%02dZ" % t[:6]


def _local_tm():
    return time.gmtime(time.time() + config.LOCAL_UTC_OFFSET_H * 3600)


def local_time_str():
    """Local wall-clock time for the OLED, e.g. 2026-01-31 14:00; None until synced."""
    if not _synced:
        return None
    return "%04d-%02d-%02d %02d:%02d" % _local_tm()[:5]


def local_hms():
    """Local time of day for console logs, e.g. 14:00:05; None until synced."""
    if not _synced:
        return None
    return "%02d:%02d:%02d" % _local_tm()[3:6]


def local_iso():
    """Local time with its UTC offset, e.g. 2026-01-31T14:00:05+02:00; None until synced.

    For the SD history only. Messages to the server always carry UTC (iso_utc).
    """
    if not _synced:
        return None
    return "%04d-%02d-%02dT%02d:%02d:%02d%+03d:00" % (_local_tm()[:6] + (config.LOCAL_UTC_OFFSET_H,))
