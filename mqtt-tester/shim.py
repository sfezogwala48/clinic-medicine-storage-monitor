"""CPython compatibility shim for MicroPython's umqtt.

umqtt.simple uses stream-style socket calls (``sock.read(n)`` /
``sock.write(buf)``) that only exist on MicroPython sockets. Import this
module first (before ``umqtt``) when running the tester on CPython; on real
MicroPython hardware this file is simply not included.

The shim patches ``socket.socket`` process-wide with a subclass, so
``umqtt.simple`` picks it up without any changes to the vendored files.
"""

import socket as _stdlib_socket


class StreamSocket(_stdlib_socket.socket):
    """A socket with MicroPython's blocking stream read/write helpers."""

    def read(self, n):
        buf = bytearray()
        while len(buf) < n:
            chunk = self.recv(n - len(buf))
            if not chunk:
                raise OSError("socket closed while reading")
            buf += chunk
        return bytes(buf)

    def write(self, buf, nbytes=None):
        if isinstance(buf, str):
            buf = buf.encode("utf-8")
        view = memoryview(buf)
        if nbytes is not None:
            view = view[:nbytes]
        self.sendall(view)
        return len(view)


_stdlib_socket.socket = StreamSocket
