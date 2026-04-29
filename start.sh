#!/bin/sh
mkdir -p /app/upload
npx prisma migrate deploy

NODE_OPTIONS="${NODE_OPTIONS} --max-old-space-size=512"
export NODE_OPTIONS

exec node /app/.output/server/index.mjs