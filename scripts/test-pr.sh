#!/usr/bin/env bash
set -euo pipefail

export NODE_ENV=development
export NEXT_PUBLIC_APP_ENV=local

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run typecheck
npm run lint
