#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${ROOT}/scripts/e2e-inventory.generated.txt"
TARGET="${1:-mobile}"

if [[ "$TARGET" != "mobile" ]]; then
  echo "ERROR: Unknown inventory target: $TARGET (use mobile)" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
{
  echo "# Mobile E2E inventory (generated $(date -u +%Y-%m-%dT%H:%MZ))"
  echo "# Regenerate: bash scripts/generate-e2e-inventory.sh"
  echo
  echo "## Maestro flows"
  find "$ROOT/maestro/flows" -type f \( -name '*.yaml' -o -name '*.yml' \) 2>/dev/null | sort
  echo
  echo "## Mobile navigation + screens"
  find "$ROOT/src/navigation" "$ROOT/src/screens" -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null | sort
} > "$OUT"

echo "Wrote $OUT"
