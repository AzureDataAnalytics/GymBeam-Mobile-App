# Architecture

## Current scope: device ↔ app only, no backend

This project phase is deliberately scoped to the phone and the (real or
mock) Raspberry Pi device — no backend, no network calls. Accounts and
drill history are stored on the phone. Auth today is entirely on-device
(`LocalAuthService`); there is no server anywhere in the current build.

## What exists elsewhere in this workspace

This app was built from scratch (an explicit decision not to port the old
Flutter app's code or UI). It still has to interoperate with real hardware
that already exists as a sibling repo:

| Repo | What it is |
| --- | --- |
| `GymBeamApp` | The **previous** Flutter mobile app. Not reused for code/UI — read only as a historical reference for the Bluetooth wire protocol (see below) and, initially and mistakenly, for a backend that turned out to be dead. |
| `GymBeamDevice/3B-WorkingCode` | The canonical Raspberry Pi firmware (Python). Runs the laser/servo/camera hardware and a Bluetooth Classic control server. Still real and still the ground truth for the device protocol. |
| `abdl_Device_Flutter`, `LIDAR-code-*` | Earlier/alternate copies of the Pi firmware. Not canonical; `GymBeamDevice` is newer and matches the product name. |

## System diagram (current phase)

```
 ┌────────────────────┐        Bluetooth Classic (RFCOMM/SPP)       ┌──────────────────────┐
 │   Android phone     │ ───────────────────────────────────────── │   Raspberry Pi        │
 │  (this app, Android │   JSON commands: Drill / Drill_preview /   │  blu.py + drill.py    │
 │   dev build only)   │   Drill_Stop / Time / device_info          │  laser + servo + cam  │
 └─────────┬───────────┘ ◄───────────────────────────────────────── └──────────────────────┘
           │
           │  Not wired up yet — see docs/device-integration.md for
           │  exactly what's needed (native module + custom dev client).

 ┌────────────────────┐
 │     iPhone          │   No transport exists. CoreBluetooth cannot open
 │  (this app, mock     │   classic RFCOMM/SPP sockets to third-party
 │   device only)       │   accessories — see docs/device-integration.md.
 └────────────────────┘

 No backend anywhere in this diagram. Auth is local-only (device SecureStore).
```

## Decisions made for this rebuild

1. **iOS ships now, with a mock device; Android gets the real Bluetooth
   Classic transport later behind a custom EAS dev-client build.** Decided
   with the project owner on 2026-09-21. A `DeviceTransport` interface
   (`src/services/device-transport`) makes the swap a matter of instantiating
   a different class, not rewriting UI.
2. **Old Flutter app is not ported.** No UI, navigation, or code from
   `GymBeamApp` carries over; only its Bluetooth protocol is treated as
   ground truth for what the Pi actually speaks.
3. **No backend right now, by explicit direction (2026-09-21).** An earlier
   version of this app integrated with the legacy Flutter app's Drupal
   backend without first verifying it was still live — it wasn't (confirmed
   dead on 2026-09-21). That integration was removed.
   `LocalAuthService` (on-device only, no network) replaces it behind the
   same `AuthService` interface, so swapping in a real backend later is a
   one-file change, not a rewrite. **Lesson applied going forward: verify
   any external endpoint is actually reachable before writing real
   integration code against it, rather than trusting what a legacy client's
   source code implies.**
4. **Exercises / Patterns / Analytics / AI have no backend and no local
   substitute either.** Rather than fabricate data for these, the
   corresponding screens were removed on 2026-10-05, along with the unused
   API error type and the planned-API document.
5. **Drill history is stored on the phone, for 30 days (2026-10-05).** With
   no backend to hold results, every finished drill is saved to
   AsyncStorage (`src/storage/drillHistoryStorage.ts`), one history per
   local account, and shown in the History tab. Sessions older than
   `HISTORY_RETENTION_DAYS` are deleted the next time history is loaded or
   saved. `src/features/history/drillRecorder.ts` turns the telemetry stream
   into a saved session.
6. **`src/app` (not root `app/`) holds Expo Router routes.** Confirmed by
   reading `@expo/cli`'s router-root detection
   (`node_modules/expo/node_modules/@expo/cli/build/src/start/server/metro/router.js`)
   rather than assumed — SDK 57 auto-prefers `src/app` when present, matching
   the AGENTS.md the `create-expo-app` scaffold shipped.

## Known risks / open items

- **Bundle identifiers are placeholders**: `com.gymbeam.trainer` (see
  `app.json`) — the legacy app never got past
  `com.example.gym_beam`/`com.example.gymBeam`, so there's no existing real
  identifier to inherit. Confirm the real one before any store submission.
- **`LocalAuthService` is a device gate, not real account security.**
  Passwords are SHA-256 hashed with no per-user salt, and an account
  exists only on the phone it was created on — intentional for an
  on-device app.
- **Password reset emails a code through EmailJS** (2026-10-05), the app's
  only internet call (`src/services/auth/passwordResetMailer.ts`). The app
  itself generates and checks the code, so this proves the user can read
  that inbox but is no stronger than the rest of `LocalAuthService`. The
  EmailJS public key ships inside the app; set a monthly send limit in the
  EmailJS account.
