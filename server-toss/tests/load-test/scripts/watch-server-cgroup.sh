#!/usr/bin/env bash

while true; do
  echo "===== $(date '+%F %T') ====="
  docker exec toss-local sh -c '
    echo "[cgroup]"
    echo -n "current="; cat /sys/fs/cgroup/memory.current
    echo -n "peak="; cat /sys/fs/cgroup/memory.peak 2>/dev/null || true
    echo "[events]"
    cat /sys/fs/cgroup/memory.events
    echo "[processes]"
    ps -o pid,ppid,rss,vsz,comm,args | sort -nr -k3 | head -20
  '
  echo
  sleep 1
done | tee app-cgroup-watch.log

