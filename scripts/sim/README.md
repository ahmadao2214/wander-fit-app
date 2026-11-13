# Simulator self-check

How an agent shows a changed journey working before review. The rule is in `AGENTS.md`.

## Local (free): iterate here

1. Start Metro against dev: `npx expo start --port 8083`. It loads `.env.local`. Never point it at prod.
2. Open the iOS simulator through T3 `device_open`. Load the app with `agent-device open host.exp.Exponent exp://127.0.0.1:8083`.
3. Sign in as the shared test account. Its credentials are `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` in the main checkout's `.env.local`.
   - The fields are `id=sign-in-email`, `id=sign-in-password` and `id=sign-in-submit`. Labels are only placeholders.
   - Paste the password; never type it. iOS briefly shows each typed character in screenshots and video.
4. Screenshot each step.

## Cloud (one capped run per pull request, for the recording)

```bash
npm run sim:tunnel -- --port 8081     # terminal 1: Metro on dev, behind Expo's ngrok tunnel
npm run sim:cloud-check               # terminal 2: one session, capped at 5 minutes, always stopped
npm run sim:cloud-check -- --journey path/to/steps.sh --name "Workout logging for PR 123"
```

`cloud-check` prints the screenshot folder, the minutes used and the recording link. Put the link in the pull request description.

- **What it does:** it starts Expo Go in an EAS cloud session, loads your Metro, signs in and waits for Today. It then runs your `--journey` script, if you pass one.
- **Writing a journey script:** it runs with `$A`, the path to the agent-device binary, and `$SHOTS`, the screenshot folder. Pass `--platform ios` on every command.
- **Typical run:** about 3 minutes. Loading the bundle takes 60–120 s of that, depending on ngrok.

### Why it works the way it does

- **The tunnel is ngrok** (`@expo/ngrok` is a dev dependency). SDK 54 has no faster built-in tunnel, and its ws-tunnel runs at about 40 KB/s.
- **`no-multipart.cjs` is loaded into Metro.** Expo Go asks for a multipart progress stream. Metro sends it uncompressed (19 MB), and ngrok relays that at about 145 KB/s. Without the multipart request, Metro sends the bundle gzipped (2.6 MB).
- **The URL is typed in by hand.** A freshly installed cloud Expo Go ignores the URL it was launched with, so the script uses **Enter URL manually**.
- **Some taps use coordinates.** Expo Go's dev-menu sheet and the menu that follows aren't in the accessibility tree. The script closes them by coordinates for an iPhone 17 at 402x874 points.
- **Agent-device is installed once.** All device steps run inside one `simulator:exec`, because each `npx` call costs 10–20 s.
- **Secrets stay out:** the password never appears in the recording, screenshots or session logs. Session events redact command arguments. Never commit `.env.eas-simulator`; it holds a session token.
