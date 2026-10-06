# GymBeam Mobile

React Native / Expo companion app for the GymBeam Raspberry Pi laser-target
training system. **The app is device ↔ app only — there is no backend.** Accounts and drill
history are stored on the phone.
See `docs/architecture.md` for how this fits together with the Pi firmware,
and `docs/mobile-build-progress.md` for what's built vs. still open.

## Requirements

- Node.js 20+ and npm
- The [Expo Go](https://expo.dev/go) app (for quick UI iteration) — note
  real device Bluetooth **will not work in Expo Go**; see
  `docs/device-integration.md`.
- No Xcode/Android Studio required for day-to-day development — EAS builds
  run in the cloud (spec section 51). You only need them for local native
  builds (`expo run:ios` / `expo run:android`).

## Getting started

```bash
npm install
cp .env.example .env
npm run start
```

Scan the QR code with Expo Go, or press `a`/`i` to open an Android/iOS
simulator if you have one configured locally.

By default `EXPO_PUBLIC_ENABLE_MOCK_DEVICE=true`, so Devices/Sessions work
immediately against a simulated GymBeam unit — no Pi, no Bluetooth, and no
backend needed to develop the UI. Auth is local-only (on-device accounts via
`expo-secure-store`) — sign up with any email/password, no network call
is made.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run start` | Start the Metro dev server |
| `npm run android` / `npm run ios` / `npm run web` | Start and open on a platform |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` / `format:check` | Prettier |
| `npm run test` / `test:watch` | Jest unit tests |
| `npm run doctor` | `expo-doctor` — dependency/config sanity check |
| `npm run build:dev` / `build:preview` / `build:production` | EAS cloud builds |

## Project layout

```
src/
  app/                  Expo Router routes ((auth), (tabs), root layout)
  design-system/        Tokens, ThemeProvider, reusable UI primitives
  features/             Feature-specific pure logic (e.g. session state machine)
  services/
    auth/                AuthService interface + LocalAuthService (on-device only)
    device-transport/    DeviceTransport interface, Mock + Bluetooth Classic impls
  state/                 Zustand stores (auth, device)
  storage/               SecureStore wrapper
  types/                 Domain + telemetry types (zod-validated)
  utils/                 Logger, etc.
tests/unit/              Jest unit tests
docs/                    Architecture, API contract, device protocol, progress log
```

## Real hardware

Testing against a real GymBeam / Raspberry Pi unit is Android-only today,
and requires a custom EAS development build (not Expo Go) — see
`docs/device-integration.md` for exact steps and why iOS can't do this yet.

## Known placeholders / limitations

- `app.json` bundle identifiers (`com.gymbeam.trainer`) are placeholders —
  confirm the real ones before any store submission.
- App icon / splash assets are the Expo template defaults, not final brand
  artwork.
- `LocalAuthService` is a device-only gate (SHA-256 hash, no salt, no
  cross-device recovery) — adequate for an on-device app, not real account
  security.
