# Native E2E runs on GitHub Actions, not EAS Workflows

The Expo-native way to run Maestro is the EAS Workflows `maestro` job, but the EAS Free plan doesn't include Maestro jobs. The repository is public, so GitHub-hosted runners, macOS included, are free. We therefore build the app inside GitHub Actions and run the Maestro CLI there: Android emulator on Linux runners, iOS Simulator on macOS runners. Revisit if we start paying for EAS, since EAS would remove the build-in-CI work. Revisit too if the repository goes private, since macOS minutes would then be billed at a multiplier.
