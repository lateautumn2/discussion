#!/bin/sh
set -e

mkdir -p /app/upload
prisma migrate deploy

exec node /app/.output/server/index.mjs
