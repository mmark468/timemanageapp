#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CODEX_BIN="${CODEX_BIN:-/Applications/Codex.app/Contents/Resources/codex}"

if [[ ! -x "$CODEX_BIN" ]]; then
  echo "Codex executable was not found at: $CODEX_BIN" >&2
  echo "Open Codex.app once or set CODEX_BIN to the codex executable path." >&2
  exit 1
fi

cd "$PROJECT_DIR"
exec "$CODEX_BIN" --cd "$PROJECT_DIR" --sandbox workspace-write --ask-for-approval on-request "$@"
