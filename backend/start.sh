#!/bin/sh
set -eu

if [ "$#" -eq 0 ]; then
  set -- serve
fi

if [ -x "./algosphere" ]; then
  exec ./algosphere "$@"
fi

exec go run ./cmd/algosphere "$@"
