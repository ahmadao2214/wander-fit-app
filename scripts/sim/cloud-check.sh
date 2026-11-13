#!/usr/bin/env bash
# One capped EAS cloud simulator run: Expo Go loads your local Metro through the tunnel, signs in
# as the shared test account and reaches Today, then runs an optional journey script. The session
# is always stopped, even after a failure. See scripts/sim/README.md.
#
# Usage: scripts/sim/cloud-check.sh [--port 8081] [--name "Sign-in to Today self-check"] [--journey path.sh]
set -uo pipefail

PORT=8081
NAME="Sign-in to Today self-check"
JOURNEY=""
MAX_MINUTES=5
AGENT_DEVICE_VERSION=0.21.37
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --journey) JOURNEY="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
EAS=(npx --yes eas-cli@latest)
SHOTS="${SIM_SHOTS_DIR:-${TMPDIR:-/tmp}/wander-fit-sim/shots}"
mkdir -p "$SHOTS"
SID=""
t0=$(date +%s)
ts() { echo "[$(( $(date +%s) - t0 ))s] $*"; }

# Credentials: the environment, or the gitignored .env.local in the main checkout. Never printed.
if [[ -z "${TEST_USER_EMAIL:-}" || -z "${TEST_USER_PASSWORD:-}" ]]; then
  ENV_FILE="${SIM_ENV_FILE:-$(git worktree list --porcelain | head -1 | cut -d' ' -f2-)/.env.local}"
  TEST_USER_EMAIL="$(grep '^TEST_USER_EMAIL=' "$ENV_FILE" | cut -d= -f2-)"
  TEST_USER_PASSWORD="$(grep '^TEST_USER_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
fi
[[ -n "$TEST_USER_EMAIL" && -n "$TEST_USER_PASSWORD" ]] || { echo "TEST_USER_EMAIL/TEST_USER_PASSWORD not found" >&2; exit 1; }
export TEST_USER_EMAIL TEST_USER_PASSWORD

# The tunnel host, from the running Metro's manifest. Start Metro first with `npm run sim:tunnel`.
HOST="$(curl -s -H 'expo-platform: ios' -H 'accept: application/json' "http://localhost:$PORT/" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(new URL(JSON.parse(s).launchAsset.url).host)}catch{}})')"
case "$HOST" in
  ""|localhost*|127.*|192.168.*|10.*) echo "No tunnel on port $PORT. Run: npm run sim:tunnel -- --port $PORT" >&2; exit 1 ;;
esac
ts "Metro tunnel: $HOST"

# Run every device step in one exec with a locally installed agent-device: an `npx` per step costs 10-20 s.
AD_DIR="${TMPDIR:-/tmp}/wander-fit-sim/agent-device-$AGENT_DEVICE_VERSION"
if [[ ! -x "$AD_DIR/node_modules/.bin/agent-device" ]]; then
  npm install --silent --prefix "$AD_DIR" "agent-device@$AGENT_DEVICE_VERSION" >/dev/null 2>&1 || { echo "agent-device install failed" >&2; exit 1; }
fi
AD="$AD_DIR/node_modules/.bin/agent-device"

cleanup() {
  # Interrupted before start returned its JSON: the session id is still in eas-cli's session file.
  [[ -n "$SID" ]] || SID="$(sed -n 's/^EAS_SIMULATOR_SESSION_ID=//p' .env.eas-simulator 2>/dev/null | tr -d "\"'")"
  [[ -n "$SID" ]] || return
  "${EAS[@]}" simulator:exec "$AD" clipboard write cleared --platform ios >/dev/null 2>&1
  "${EAS[@]}" simulator:stop --id "$SID" --non-interactive 2>&1 | grep -v DEP0040 | tail -1
  printf '# managed by eas-cli\n' > .env.eas-simulator
  "${EAS[@]}" simulator:get --id "$SID" --json --non-interactive 2>/dev/null | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const d=JSON.parse(s);
    const m=(new Date(d.finishedAt)-new Date(d.startedAt))/60000;
    if(m>0)console.log(`Cloud minutes used: ${m.toFixed(2)}`)}catch{}})'
  OWNER_SLUG="$(node -p 'const e=require("./app.json").expo; e.owner+"/projects/"+e.slug')"
  echo "Recording (Expo sign-in required): https://expo.dev/accounts/$OWNER_SLUG/simulator-sessions/$SID"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf '# managed by eas-cli\n' > .env.eas-simulator
ts "starting session (capped at $MAX_MINUTES minutes)"
START_JSON="$("${EAS[@]}" simulator:start --platform ios --type agent-device --expo-go \
  --open-url "exp://$HOST" --max-duration-minutes "$MAX_MINUTES" --max-idle-time-minutes 2 \
  --name "$NAME" --json --non-interactive 2>/dev/null)"
# The dotenv quotes the session id, so read it from the JSON.
SID="$(printf '%s' "$START_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).id)}catch{}})')"
[[ -n "$SID" ]] || { echo "simulator:start failed" >&2; exit 1; }
ts "session $SID ready"

"${EAS[@]}" simulator:exec bash "$ROOT/scripts/sim/sign-in-to-today.sh" "$AD" "$HOST" "$SHOTS" "$JOURNEY" 2>&1 \
  | grep -v -E 'DEP0040|trace-deprecation'
STATUS=${PIPESTATUS[0]}
ts "screenshots in $SHOTS"
exit "$STATUS"
