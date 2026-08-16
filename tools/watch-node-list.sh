#!/usr/bin/env bash
# Watches content/nodes/ and reruns build-node-list.py whenever a file
# changes, so nodes.json stays current while you preview locally.
#
# Requires fswatch (macOS: brew install fswatch).
#
# Usage: tools/watch-node-list.sh

set -euo pipefail
cd "$(dirname "$0")/.."

python3 tools/build-node-list.py

echo "Watching content/nodes/ for changes (Ctrl+C to stop)..."
fswatch -o content/nodes | while read -r _; do
  python3 tools/build-node-list.py
done
