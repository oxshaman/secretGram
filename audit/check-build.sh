#!/usr/bin/env bash
#
# Checks that the Vite build is reproducible by building twice and comparing output.
# Exit code 0 = builds match, 1 = builds differ or build failed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."

cd "$ROOT"

echo "Reproducible build check"
echo "========================"
echo ""

# Clean previous builds
rm -rf dist dist-check-1 dist-check-2

echo "Build 1..."
npx vite build --mode production 2>/dev/null
mv dist dist-check-1

echo "Build 2..."
npx vite build --mode production 2>/dev/null
mv dist dist-check-2

echo ""
echo "Comparing builds..."

# Compare file lists
FILES1=$(cd dist-check-1 && find . -type f | sort)
FILES2=$(cd dist-check-2 && find . -type f | sort)

if [ "$FILES1" != "$FILES2" ]; then
  echo "  FAIL  File lists differ between builds"
  rm -rf dist-check-1 dist-check-2
  exit 1
fi

echo "  PASS  Same files in both builds"

# Compare file contents via hash
FAILURES=0
while IFS= read -r file; do
  HASH1=$(shasum -a 256 "dist-check-1/$file" | awk '{print $1}')
  HASH2=$(shasum -a 256 "dist-check-2/$file" | awk '{print $1}')
  if [ "$HASH1" != "$HASH2" ]; then
    echo "  FAIL  $file differs between builds"
    FAILURES=$((FAILURES + 1))
  fi
done <<< "$FILES1"

# Cleanup
rm -rf dist-check-1 dist-check-2

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo "Reproducible build: FAILED ($FAILURES file(s) differ)"
  echo "Note: Vite may embed timestamps or random hashes. This may need vite.config.js tuning."
  exit 1
else
  echo "Reproducible build: PASSED (all files identical)"
  exit 0
fi
