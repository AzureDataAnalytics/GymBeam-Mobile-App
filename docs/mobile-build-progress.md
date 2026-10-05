# Mobile build progress

Last updated: 2026-09-21

## Scope for this phase

Device ↔ app only. No backend, by explicit project-owner direction — the
backend is its own later phase. See `docs/api-integration.md` for what that
means concretely and why (an earlier misstep integrating with a backend that
turned out to be decommissioned).

## Completed

- **Phase 1 — Inspection.** Surveyed sibling repos (`GymBeamApp`,
  `GymBeamDevice`, `abdl_Device_Flutter`, `LIDAR-code-*`) for existing
  frontend, backend, Pi firmware, auth, and telemetry. Findings in
  `docs/architecture.md`.
- **Phase 2 — Architecture assessment.** Identified the real system shape
  (direct Bluetooth Classic phone↔Pi link) and the iOS/Bluetooth-Classic
  platform conflict. Decision made with the project owner: ship iOS now on a
  mock device, build the real Android Bluetooth transport behind a swappable
  interface for later.
- **Phase 3 — Expo project foundation.**
  - Expo SDK 57, TypeScript strict + `noUncheckedIndexedAccess`, Expo
    Router (routes under `src/app/`, confirmed via `@expo/cli` source, not
    assumed), path aliases (`@/*` → `src/*`).
  - ESLint (`eslint-config-expo` + `eslint-config-prettier`), Prettier,
    Jest (`jest-expo` preset) all configured and passing.
  - `app.json` / `eas.json` scaffolded with placeholder bundle identifiers
    (`com.gymbeam.trainer` — **needs confirmation before any store
    submission**, see `docs/architecture.md`), development/preview/
    production EAS build profiles.
  - `.env.example` / typed, zod-validated env config (`src/constants/env.ts`)
    — no API/WS URL config exists, deliberately, until the backend phase.
- **Phase 4 — Design system (started).** Tokens (color/spacing/type/radius/
  shadow, light+dark, respects OS preference), and core primitives: `Text`,
  `Button`, `Card`, `Badge`, `TextField`, `Screen`, `EmptyState`,
  `LoadingState`, `ErrorState`.
- **Phase 5 — Auth & navigation (started).**
  - `AuthService` interface + `LocalAuthService` implementation: accounts
    and sessions live entirely on-device in `expo-secure-store` (SHA-256
    hashed passwords, no salt — a device gate, not real account security;
    see the caveat in `docs/architecture.md`). No network call anywhere in
    auth.
  - Expo Router groups: `(auth)` (login/register/forgot-password,
    working login+register forms with zod validation) and `(tabs)`
    (Home/Exercises/Sessions/Devices/Profile), both auth-gated via redirects
    driven by `useAuthStore`.
- **Device transport layer** (pulled forward from Phase 9/13 because the
  iOS decision required it): `DeviceTransport` interface, a fully-functional
  `MockDeviceTransport` (real simulated connect/drill/telemetry cycle, never
  touches hardware). See `docs/device-integration.md`.
- **Real Android Bluetooth Classic transport — implemented, untested on
  hardware.** `BluetoothClassicTransport` connects to the Pi's existing,
  unmodified firmware over `react-native-bluetooth-classic`. Verified the
  exact library API and its `delimiter: ''` raw-passthrough mode against the
  library's own source/docs (not assumed) rather than guessing, since the
  Pi's firmware sends no delimiter between messages. Built:
  - `jsonFraming.ts` — pure JSON-stream reassembly (unit tested, including a
    real bug caught and fixed: an early version re-scanned the whole
    accumulated buffer on every `push()` instead of only the new chunk).
  - `piProtocol.ts` — typed command builders and zod-validated response
    parsers/normalizers matching the Pi's exact wire shapes (unit tested).
  - `nativeBluetooth.ts` / `androidBluetoothPermissions.ts` — bonded-device
    listing and runtime permission requests.
  - `src/app/devices/pair.tsx` — a real pairing screen (Android only).
  - `deviceStore` now persists the paired MAC address and can re-create/
    re-subscribe the active transport when pairing changes.
  Two firmware limitations documented rather than papered over: no ack for
  start/stop (so those are optimistic client-side transitions), and the Pi's
  drill loop repeats forever per lap rather than completing once — see
  `docs/device-integration.md`.
- **Telemetry model**: schema-versioned, zod-validated `TelemetryEvent` type
  (`src/types/telemetry.ts`, now with a shared `createTelemetryEvent`
  factory used by both transports) and a pure, unit-tested session state
  machine (`src/features/sessions/sessionStateMachine.ts`).
- **A working end-to-end vertical slice**: Devices tab connects to either
  transport; Sessions tab runs a demo 5-target drill and streams live
  telemetry through the same pipeline a real device would use.

## Verified

- `npx tsc --noEmit` — clean.
- `npx expo lint` — clean.
- `npx expo-doctor` — 21/21 checks passing (fixed along the way: a stray
  `newArchEnabled` app.json key no longer valid in SDK 57, a missing
  `expo-font` peer dependency from `@expo/vector-icons`, an `@types/jest`
  version mismatch).
- `npx jest` — 33/33 unit tests passing, including the Bluetooth JSON
  framing/protocol logic and `LocalAuthService` (against manual
  `expo-secure-store`/`expo-crypto` mocks in `__mocks__/`, since those
  native modules aren't available under Jest).
- `npx expo export --platform android` **and** `--platform ios` — both
  bundle successfully, confirming Metro resolves the `src/app` router root,
  all `@/*` path aliases, and the new native `react-native-bluetooth-classic`
  dependency with no missing-module errors on either platform.
- `curl -I http://84.46.252.156` — confirmed the old Drupal backend host is
  dead (404 on every path); this is *why* auth was moved to
  `LocalAuthService`, not a hypothetical.
- **Not yet verified: an actual run against real hardware.** Everything
  above is static analysis and bundling — `BluetoothClassicTransport` has
  never connected to a real Pi, because that requires a physical Android
  phone and an EAS development build, neither available in the environment
  this was built in. See `docs/device-integration.md`'s "First real test"
  section for the exact steps to do that. Also flagged there: this Bluetooth
  library is unconfirmed (not known-broken, just untested) against Expo
  SDK 57's default-on New Architecture.

## Corrections made mid-build

- Initially wired `DrupalAuthService` against the legacy backend **without
  verifying it was reachable** — read the endpoint out of old client source
  and trusted it. The project owner caught this; verified by request and
  the host is dead. Removed `DrupalAuthService`, `src/api/client.ts`,
  `src/api/queryClient.ts`, and the `QueryClientProvider` wiring in
  `src/app/_layout.tsx` (all unused once the backend dependency was gone,
  rather than leaving dead scaffolding in the tree). Replaced with
  `LocalAuthService`. `@tanstack/react-query` uninstalled until the backend
  phase actually needs it.

## Current phase

Device ↔ app only, per explicit direction. Phase 4/5 (design system +
local auth/navigation) in place; Phase 9/13 (devices) and Phase 10/11
(sessions/telemetry) have a working mock vertical slice ahead of schedule.
Backend-dependent phases (accounts-as-a-service, exercises, patterns,
analytics, AI) are intentionally not started.

## Known limitations / not yet built

- **Real hardware test of `BluetoothClassicTransport` — pending.** Code is
  written and reviewed; needs an EAS development build installed on a
  physical Android phone, paired to a real Pi. Project owner has both.
- Onboarding flow (device calibration, first-exercise walkthrough) — pairing
  itself now exists (`devices/pair.tsx`), but no broader onboarding flow yet.
- Exercise library, Pattern editor, Analytics, AI Coach — no backend and no
  local substitute; screens are honest empty states, not mock data.
- Session results/history screens — not started.
- Offline queueing/sync — not applicable yet (nothing to sync to).
- Notifications — not started.
- Real company/product identity for `app.json` bundle identifiers, app
  icon, and splash artwork — currently clearly-marked placeholders.
- Component/integration/E2E test suites beyond the unit-test files above.
- A suggested (not started, not this repo's scope) Pi-firmware enhancement:
  explicit start/stop acks so the app doesn't have to optimistically assume
  those transitions — see `docs/device-integration.md`.

## Next up

`eas login` (not done — needs the project owner's interactive credentials),
then `eas build --profile development --platform android`, install on the
Android phone, pair the Pi at the OS level, and walk through the "First real
test" steps in `docs/device-integration.md`. After that succeeds (or
reveals bugs to fix), continue with onboarding/calibration UI. Backend phase
(accounts, exercises, patterns, analytics, AI, telemetry ingestion) starts
only when explicitly asked for — see `docs/api-integration.md`.
