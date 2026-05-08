#!/usr/bin/env bash

while true; do
  echo "===== $(date '+%F %T') ====="
  docker stats --no-stream mysql
  echo
  sleep 1
done | tee memory-watch.log