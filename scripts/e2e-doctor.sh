#!/usr/bin/env bash
set -euo pipefail

export NODE_ENV=development
export NEXT_PUBLIC_APP_ENV=local

TARGET="${1:-mobile}"
if [[ "$TARGET" != "mobile" ]]; then
  echo "ERROR: Unknown doctor target: $TARGET (use mobile)" >&2
  exit 1
fi

if command -v maestro >/dev/null 2>&1; then
  maestro --version
else
  echo "ERROR: maestro CLI not on PATH (install for mobile E2E lanes)" >&2
  exit 1
fi

echo "E2E doctor OK (mobile)"
