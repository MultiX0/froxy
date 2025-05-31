#!/bin/bash

mkdir -p /backups

while true; do
  echo "[INFO] Running backup..."
  PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h postgres -U $POSTGRES_USER -F c -d $POSTGRES_DB -f /backups/$(date +%Y-%m-%d_%H-%M-%S).dump
  echo "[INFO] Sleeping for 24 hours..."
  sleep 86400
done
