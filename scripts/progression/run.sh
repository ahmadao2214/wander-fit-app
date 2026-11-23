#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
backend=${CONVEX_LOCAL_BACKEND:-$HOME/.cache/convex/binaries/precompiled-2026-10-10-72ce13c/convex-local-backend}
[[ -x "$backend" ]] || { echo 'Set CONVEX_LOCAL_BACKEND to the pinned local backend executable.' >&2; exit 1; }
umask 077
scratch=$(mktemp -d)
cleanup() {
  if [[ -n ${backend_pid:-} ]]; then kill "$backend_pid" 2>/dev/null || :; wait "$backend_pid" 2>/dev/null || :; fi
  rm -rf "$scratch"
}
trap cleanup EXIT
trap 'exit 1' INT TERM
cd "$scratch"
mkdir project
cd project
rsync -a --exclude __tests__ --exclude auth.config.ts "$root/convex" "$root/lib" .
cp "$root/package.json" .
cp "$root/scripts/progression/fixture.js" convex/progressionFixture.js
ln -s "$root/node_modules" node_modules
free_port() { node -e "const server = require('node:net').createServer(); server.listen(0, '127.0.0.1', () => {console.log(server.address().port); server.close()})"; }
port=$(free_port)
site_port=$(free_port)
while [[ $site_port == "$port" ]]; do site_port=$(free_port); done
secret=$(openssl rand -hex 32)
key=$("$backend" keygen admin-key --instance-name progression --instance-secret "$secret")
url="http://127.0.0.1:$port"
printf 'CONVEX_SELF_HOSTED_URL=%s\nCONVEX_SELF_HOSTED_ADMIN_KEY=%s\n' "$url" "$key" > "$scratch/env"
"$backend" -i 127.0.0.1 -p "$port" --site-proxy-port "$site_port" --local-storage "$scratch/storage" --instance-name progression --instance-secret "$secret" --disable-beacon "$scratch/db.sqlite3" >"$scratch/backend.log" 2>&1 &
backend_pid=$!
for ((attempt=0; attempt<100; attempt++)); do
  kill -0 "$backend_pid" || { echo 'Local backend exited during startup.' >&2; exit 1; }
  if curl -fsS --max-time 1 "$url/version" >/dev/null 2>&1; then break; fi
  sleep 0.2
done
curl -fsS --max-time 1 "$url/version" >/dev/null
env -i HOME="$scratch" PATH="$PATH" CI=1 ./node_modules/.bin/convex dev --once --env-file "$scratch/env" --typecheck disable --codegen disable
env -i HOME="$scratch" PATH="$PATH" node --env-file="$scratch/env" "$root/scripts/progression/check.mjs"
