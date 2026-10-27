#!/usr/bin/env bash
set -euo pipefail

output="$(bash scripts/bash/main.sh)"
if [[ "$output" != "Hello from School OS scripts (bash)" ]]; then
    echo "unexpected output: $output"
    exit 1
fi

echo "bash test passed"
