#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required: https://nodejs.org/"
  exit 1
fi
echo "Starting Duanwang Cup on http://localhost:3000 ..."
(sleep 2; open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null || true) &
node server.js
