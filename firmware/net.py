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


def sync_clock():
    """Best-effort NTP sync so `recordedAt` timestamps are real UTC.

    MicroPython boots with the epoch at 2021-01-01, so without this the
    timestamps are wrong until the first successful sync. Retries a few
    times; failure is non-fatal (the server also stamps arrival time).
    """
    for attempt in range(3):
        try:
            import ntptime

            ntptime.settime()
            print("clock: NTP sync ok (%s)" % iso_utc())
            return True
        except Exception as e:  # DNS/DHCP can lag right after boot
            print("clock: NTP attempt %d failed: %r" % (attempt + 1, e))
            time.sleep(2)
    return False


def iso_utc():
    """UTC timestamp in the exact format the server ingests: 2026-01-31T12:00:00Z."""
    t = time.gmtime()
    return "%04d-%02d-%02dT%02d:%02d:%02dZ" % t[:6]
