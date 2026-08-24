#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail

test_file="$1"
test_name="$2"
log_file="$(mktemp)"

if ! psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  --set ON_ERROR_STOP=1 \
  --file "$test_file" 2>&1 | tee "$log_file"; then
  while IFS= read -r line; do
    printf '::error title=%s::%s\n' "$test_name" "$line"
  done < <(tail -n 20 "$log_file")
  exit 1
fi