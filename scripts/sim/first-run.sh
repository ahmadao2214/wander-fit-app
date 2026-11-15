#!/usr/bin/env bash
# Device steps for an EAS cloud session: load the app in Expo Go and walk the First Run, from the
# promise screen to Day 1's warm-up, saving the plan to a new +clerk_test account (code 424242).
# Run by cloud-check.sh --first-run inside ONE `eas simulator:exec`.
# Usage: first-run.sh <agent-device-binary> <exp-host> <shots-dir>
# Reads FIRST_RUN_EMAIL / FIRST_RUN_PASSWORD from the environment. Never prints the password.
set -uo pipefail
A="$1"; HOST="$2"; SHOTS="$3"
# SIM_APP_ID lets a local dry run drive a dev client instead of Expo Go.
APP_ID="${SIM_APP_ID:-host.exp.Exponent}"
t0=$(date +%s)
ts() { echo "  [+$(( $(date +%s) - t0 ))s] $*"; }
ad() { "$A" "$@" --platform ios >/dev/null 2>&1; }
shot() { "$A" screenshot "$SHOTS/$1.png" --platform ios >/dev/null 2>&1 && ts "screenshot $SHOTS/$1.png"; }
fail() { ts "FAIL: $*"; shot fail; exit 1; }
tap() { ad press "$1" || fail "tap $1"; ad wait "${2:-1200}"; }

# Attach without relaunching. The state path must be under /Users/expo (the remote VM), not your Mac.
"$A" open "$APP_ID" --foreground --platform ios 2>&1 | grep -o 'Session state: /Users/[a-z]*'

# A freshly installed Expo Go drops the launch URL; type it into "Enter URL manually" (see sign-in-to-today.sh).
if ad wait 'id=first-run-start' 8000; then
  ts "launch URL loaded the app"
else
  ad wait text "Enter URL manually" 5000 || fail "neither the app nor Expo Go home is showing"
  ad press 201 311; ad press 201 358; ad type "exp://$HOST"; ad press 201 411
  ad wait 'id=first-run-start' 120000 || fail "First Run never appeared"
  ts "app loaded via Enter URL manually"
fi

# Expo Go's dev-menu onboarding sheet, then the dev menu: tap Continue, then the menu's X.
# If the sheet didn't show, the first tap lands on "I have an account"; Sign up comes back.
ad wait 2000; ad press 201 799; ad wait 1500; ad press 376 290; ad wait 1500
if ad wait 'id=sign-in-email' 1500; then
  ad press 'label="Sign up"' || fail "back to the First Run"
fi
ad wait 'id=first-run-start' 10000 || fail "promise screen"
ad wait 1000
shot 01-promise
tap 'id=first-run-start'

ad wait 'id=sport-Basketball' 15000 || fail "sport picker"
tap 'id=sport-Basketball'
shot 02-sport
tap 'id=first-run-continue'
ad wait 'id=season-slider' 5000 || fail "season"
shot 03-season
tap 'id=first-run-continue'
tap 'id=day-Tue'
shot 04-days
tap 'id=first-run-continue'
tap 'id=age-14-17'
tap 'id=years-new'
shot 05-about
tap 'id=first-run-see-plan' 6000
shot 06-reveal
tap 'id=first-run-save' 2000
tap 'id=save-plan-email' 1500
ad fill 'id=save-plan-name' "Riley" || fail "name"
ad fill 'id=save-plan-email-input' "$FIRST_RUN_EMAIL" || fail "email"
# A throwaway password, pasted so iOS doesn't flash each character.
ad clipboard write "$FIRST_RUN_PASSWORD"
ad press 'id=save-plan-password'; ad wait 1000
# iOS may offer a strong password for a new-password field; decline it.
ad press 'role=button label="Close"'; ad wait 800
ad press 'id=save-plan-password'
ad wait 'role=cell label="Paste"' 2000 || { ad longpress 'id=save-plan-password'; ad wait 'role=cell label="Paste"' 3000; } \
  || { ad clipboard write cleared; fail "Paste menu never appeared"; }
ad press 'role=cell label="Paste"' || { ad clipboard write cleared; fail "paste"; }
ad clipboard write cleared
shot 07-account
tap 'id=save-plan-create' 6000
ad press 'role=button label="Not Now"'; ad wait 800
ad press 'id=save-plan-code'; ad wait 800
ad type 424242 --delay-ms 300 || fail "code"
ad wait 'id=ready-start' 30000 || fail "ready screen never appeared"
ad wait 1500
shot 08-ready
tap 'id=ready-start' 2000
ad wait 'id=warmup-skip' 30000 || fail "Day 1 warm-up never appeared"
ad wait 1000
shot 09-day-1
ts "reached Day 1"
