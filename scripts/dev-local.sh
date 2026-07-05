#!/bin/sh
set -e

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
NODE_DIR="$ROOT_DIR/.local-node/node-v24.14.0-darwin-arm64"

PATH="$NODE_DIR/bin:$PATH" "$NODE_DIR/bin/node" "$NODE_DIR/lib/node_modules/npm/bin/npm-cli.js" run dev
