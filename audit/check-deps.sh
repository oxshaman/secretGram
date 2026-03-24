#!/usr/bin/env bash
#
# Verifies vendored cryptographic dependencies against known-good SHA-256 hashes.
# Exit code 0 = all hashes match, 1 = mismatch or missing file.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."
VENDOR_DIR="$ROOT/crypto/vendor"
CHECKSUMS_FILE="$VENDOR_DIR/CHECKSUMS.sha256"

if [ ! -f "$CHECKSUMS_FILE" ]; then
  echo "FAIL: CHECKSUMS.sha256 not found at $CHECKSUMS_FILE"
  exit 1
fi

echo "Verifying vendored dependency hashes..."
echo ""

FAILURES=0

while IFS= read -r line; do
  # Skip comments and blank lines
  [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue

  # Parse: <hash>  <filename>  # comment
  EXPECTED_HASH=$(echo "$line" | awk '{print $1}')
  FILENAME=$(echo "$line" | awk '{print $2}')

  FILEPATH="$VENDOR_DIR/$FILENAME"

  if [ ! -f "$FILEPATH" ]; then
    echo "  FAIL  $FILENAME: file not found"
    FAILURES=$((FAILURES + 1))
    continue
  fi

  ACTUAL_HASH=$(shasum -a 256 "$FILEPATH" | awk '{print $1}')

  if [ "$ACTUAL_HASH" = "$EXPECTED_HASH" ]; then
    echo "  PASS  $FILENAME ($ACTUAL_HASH)"
  else
    echo "  FAIL  $FILENAME"
    echo "         expected: $EXPECTED_HASH"
    echo "         actual:   $ACTUAL_HASH"
    FAILURES=$((FAILURES + 1))
  fi
done < "$CHECKSUMS_FILE"

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo "Dependency check: $FAILURES file(s) failed verification."
  exit 1
else
  echo "Dependency check: all vendored files match expected hashes."
  exit 0
fi
