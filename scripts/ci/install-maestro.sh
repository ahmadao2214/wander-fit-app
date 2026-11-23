#!/usr/bin/env bash
# Installs one pinned Maestro CLI into ~/.maestro for the web E2E jobs (#137).
# CI caches ~/.maestro keyed on this file's hash, so most shards skip this.
# On a cache miss it downloads the release zip straight from GitHub with
# retries and checks it against the pinned checksum, instead of piping
# get.maestro.mobile.dev into bash (whose single download 500'd a shard).
# To upgrade: change both values below from the release's checksums_sha256.txt.
set -euo pipefail

MAESTRO_VERSION="2.12.1"
MAESTRO_SHA256="54dbb0716425626604973cbb374c585ca30272375d9ce15177a1152765ddd9d7"

dest="${MAESTRO_DIR:-$HOME/.maestro}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl --fail --location --silent --show-error \
  --retry 5 --retry-delay 3 --retry-all-errors \
  "https://github.com/mobile-dev-inc/maestro/releases/download/cli-${MAESTRO_VERSION}/maestro.zip" \
  -o "$tmp/maestro.zip"
actual="$(sha256sum "$tmp/maestro.zip" | cut -d' ' -f1)"
if [ "$actual" != "$MAESTRO_SHA256" ]; then
  echo "maestro.zip checksum mismatch: got $actual, want $MAESTRO_SHA256" >&2
  exit 1
fi
unzip -q "$tmp/maestro.zip" -d "$tmp"
mkdir -p "$dest"
rm -rf "$dest/bin" "$dest/lib"
cp -R "$tmp/maestro/." "$dest/"
"$dest/bin/maestro" --version
