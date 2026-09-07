#!/bin/sh
# Railway bind-mounts the volume at /app/data owned by root, but the app
# runs as the unprivileged `node` user (SQLite needs write access).
# This entrypoint starts as root, hands the data dir to `node`, then drops
# privileges before exec'ing the app.
set -e
mkdir -p /app/data
chown -R node:node /app/data
exec su-exec node "$@"
