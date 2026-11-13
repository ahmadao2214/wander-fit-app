#!/usr/bin/env bash
# Device steps for an EAS cloud session: load the app in Expo Go, sign in, reach Today.
# Run by cloud-check.sh inside ONE `eas simulator:exec`, so the session env loads once.
# Usage: sign-in-to-today.sh <agent-device-binary> <exp-host> <shots-dir> [journey-steps.sh]
# Reads TEST_USER_EMAIL / TEST_USER_PASSWORD from the environment. Never prints them.
set -uo pipefail
A="$1"; HOST="$2"; SHOTS="$3"; JOURNEY="${4:-}"
t0=$(date +%s)
ts() { echo "  [+$(( $(date +%s) - t0 ))s] $*"; }
ad() { "$A" "$@" --platform ios >/dev/null 2>&1; }
shot() { "$A" screenshot "$SHOTS/$1.png" --platform ios >/dev/null 2>&1 && ts "screenshot $SHOTS/$1.png"; }
fail() { ts "FAIL: $*"; shot fail; exit 1; }

# Attach without relaunching. The state path must be under /Users/expo (the remote VM), not your Mac.
"$A" open host.exp.Exponent --foreground --platform ios 2>&1 | grep -o 'Session state: /Users/[a-z]*'

# A freshly installed Expo Go drops the launch URL. Type it into "Enter URL manually" instead.
# That cell is merged in the accessibility tree, so these are coordinates (iPhone 17, 402x874 points).
if ad wait 'id=sign-in-email' 8000; then
  ts "launch URL loaded the app"
else
  ad wait text "Enter URL manually" 5000 || fail "neither the app nor Expo Go home is showing"
  ad press 201 311; ad press 201 358; ad type "exp://$HOST"; ad press 201 411
  ad wait 'id=sign-in-email' 120000 || fail "sign-in screen never appeared"
  ts "app loaded via Enter URL manually"
fi

# First launch shows Expo Go's dev-menu onboarding sheet, then the dev menu; neither is in the
# accessibility tree. Tap Continue, then the menu's X. Both points are empty space on bare sign-in.
ad wait 2000; ad press 201 799; ad wait 1500; ad press 376 290; ad wait 1500
shot 01-sign-in

# Paste the password: typing it makes iOS flash each character in the recording.
ad fill 'id=sign-in-email' "$TEST_USER_EMAIL" || fail "email field"
ad clipboard write "$TEST_USER_PASSWORD"
# Focus the field (the keyboard moves it), then open the Paste menu: a second tap on iOS 26, a long press on iOS 27.
ad press 'id=sign-in-password'; ad wait 1000; ad press 'id=sign-in-password'
ad wait 'role=cell label="Paste"' 2000 || { ad longpress 'id=sign-in-password'; ad wait 'role=cell label="Paste"' 3000; } \
  || { ad clipboard write cleared; fail "Paste menu never appeared"; }
ad press 'role=cell label="Paste"' || { ad clipboard write cleared; fail "paste"; }
ad clipboard write cleared
shot 02-filled
ad press 'id=sign-in-submit' || fail "submit"
ad wait 'role=button label="Not Now"' 10000 && ad press 'role=button label="Not Now"'
ad wait 'id=today-workout-card' 60000 || fail "Today never appeared"
ad wait 2000
shot 03-today
ts "reached Today"

if [[ -n "$JOURNEY" ]]; then
  ts "running $JOURNEY"
  A="$A" SHOTS="$SHOTS" bash "$JOURNEY" || fail "journey script failed"
  ts "journey done"
fi
