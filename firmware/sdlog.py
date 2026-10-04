"""microSD helpers: a local history log and an offline backlog.

  history  SD_LOG_FILE     every reading, as CSV, whether or not the link is up
  backlog  SD_BACKLOG_FILE publishes that could not be sent, replayed in order
                           once the link is back (one "<topic>\\t<json>" per line)

Everything is best-effort. With SD_ENABLED = False, or no card in the slot,
each call here is a harmless no-op and the firmware behaves as if there were
no SD support at all.
"""

import os

import config

_tried = False
_ready = False

_HISTORY_HEADER = "recordedAt,source,temperatureC,humidityPct,doorOpen\n"


def mount():
    """Mount the card on first use; return True if it is usable."""
    global _tried, _ready
    if _tried:
        return _ready
    _tried = True
    if not config.SD_ENABLED:
        return False
    try:
        import machine
        import sdcard

        spi = machine.SPI(
            0,
            sck=machine.Pin(config.SD_SCK_PIN),
            mosi=machine.Pin(config.SD_MOSI_PIN),
            miso=machine.Pin(config.SD_MISO_PIN),
        )
        card = sdcard.SDCard(spi, machine.Pin(config.SD_CS_PIN, machine.Pin.OUT))
        os.mount(card, config.SD_MOUNT_PATH)
        _ready = True
        print("sd: mounted at %s" % config.SD_MOUNT_PATH)
    except Exception as e:
        print("sd: unavailable, continuing without it: %r" % e)
    return _ready


def _exists(path):
    try:
        os.stat(path)
        return True
    except OSError:
        return False


def _append(path, text):
    try:
        with open(path, "a") as f:
            f.write(text)
        return True
    except OSError as e:
        print("sd: write to %s failed: %r" % (path, e))
        return False


def _cell(value):
    return "" if value is None else str(value)


def log_history(recorded_at, source, temp_c=None, humidity=None, door_open=None):
    """Append one reading to the CSV history (header written on first use)."""
    if not mount():
        return
    if not _exists(config.SD_LOG_FILE):
        _append(config.SD_LOG_FILE, _HISTORY_HEADER)
    door = None if door_open is None else int(door_open)
    _append(
        config.SD_LOG_FILE,
        "%s,%s,%s,%s,%s\n" % (recorded_at, source, _cell(temp_c), _cell(humidity), _cell(door)),
    )


def has_backlog():
    return mount() and _exists(config.SD_BACKLOG_FILE)


def enqueue(topic, body):
    """Queue one unsent publish (str topic, str JSON body). False if it was not saved."""
    if not mount():
        return False
    return _append(config.SD_BACKLOG_FILE, "%s\t%s\n" % (topic, body))


def _pos_file():
    return config.SD_BACKLOG_FILE + ".pos"


def _read_pos():
    try:
        with open(_pos_file()) as f:
            return int(f.read())
    except (OSError, ValueError):
        return 0


def _remove(path):
    try:
        os.remove(path)
    except OSError:
        pass


def drain(publish, limit):
    """Replay up to `limit` queued publishes, oldest first.

    publish(topic: bytes, body: bytes) must raise OSError when the link is
    down; that error is re-raised here after progress is saved. The byte
    offset of the next unsent row lives in a .pos file next to the backlog,
    so a link failure or a reboot resumes where it stopped instead of
    re-sending rows. Returns True once the backlog is empty (and deleted).
    """
    if not has_backlog():
        return True
    pos = _read_pos()
    done = False
    link_error = None
    try:
        with open(config.SD_BACKLOG_FILE, "rb") as f:
            f.seek(pos)
            for _ in range(limit):
                line = f.readline()
                if not line:
                    done = True
                    break
                topic, _, body = line.rstrip().partition(b"\t")
                if body:
                    try:
                        publish(topic, body)
                    except OSError as e:
                        link_error = e
                        break
                pos = f.tell()
    except OSError as e:
        print("sd: backlog read failed: %r" % e)
        return False

    if done:
        _remove(config.SD_BACKLOG_FILE)
        _remove(_pos_file())
    else:
        try:
            with open(_pos_file(), "w") as f:
                f.write(str(pos))
        except OSError as e:
            print("sd: could not save replay position: %r" % e)
    if link_error is not None:
        raise link_error
    return done
