# API integration

## Status: no backend right now — this is deliberate

There is currently **no backend at all**. This phase of the project is
scoped to device ↔ app only (local auth, and the device transport layer —
see `docs/device-integration.md`). Backend integration is an explicit,
separate later phase; nothing in this codebase should make a network call
until that phase starts.

## What happened to the old backend

The legacy Flutter app (`GymBeamApp`, a sibling repo) talked to a Drupal REST
backend at a raw IP (`84.46.252.156`). Early in this project I read that
integration out of the old client's source and initially wired a mobile
`DrupalAuthService` against it **without verifying the host was still
live** — a mistake, caught when the project owner pointed out they no longer
have access to it. Verified by request on 2026-09-21:

```
$ curl -I http://84.46.252.156
HTTP/1.1 404 Not Found
Server: nginx/1.24.0 (Ubuntu)
```

The host responds, but the Drupal site is gone — every endpoint 404s. That
backend is **decommissioned** and must not be depended on. `DrupalAuthService`
was removed from the codebase; auth is now `LocalAuthService`
(`src/services/auth/LocalAuthService.ts`), which stores accounts and a
session entirely on-device via `expo-secure-store`, no network involved.

## Historical reference (Drupal's data shapes, kept only for the next phase)

If a future backend inherits any of the old Drupal schema, these are the
shapes the legacy client used — reconstructed from
`GymBeamApp/lib/api/web_API.dart` and
`GymBeamApp/lib/features/device_registration/data/request/register_device_request.dart`,
**unverified against a live instance** since it's dead:

- Auth: Drupal session-cookie + CSRF token flow. `POST /user/login?_format=json`
  with `{name, pass}`, returning `{current_user: {uid, name, roles}, csrf_token, logout_token}`.
- `drill` node (session history): `field_drill_name`, `field_drill_key`,
  `field_drill_time_date`, `field_drill_run` (CSV-ish per-point times),
  `field_drill_additional_details` (JSON blob of duration/calories/intensity).
- `device_metrics` node: `field_matrix_devies_id`, `field_matrix_macaddress`,
  `field_systemmatrix` (JSON blob of cpu/mem/disk/temp/uptime).
- `device` node: `field_deviceid`, `field_devicename`, `field_devicetype`,
  `field_location`, `field_macaddress`, `field_manufacturer`,
  `field_networkmetrics`, `field_post_code`, `field_registered_date`,
  `field_registered_user`, `field_status`, `field_systemmetrics`,
  `field_device_file`.
- A hardcoded `admin`/`admin!@#` Basic-Auth credential was found in the old
  client's source. If any new backend reuses old credentials/database from
  this system, rotate that first — it should never have shipped in a mobile
  binary.

**Do not build against this from memory as if it's live.** It isn't.

## The contract for whenever the backend phase starts

Exercises, Patterns, Sessions-as-a-resource, Analytics, and AI need a real
API that doesn't exist yet in any form (the old system never had one for
these — only a post-hoc drill-history node and a periodic health snapshot).
Sketch, to align mobile/web/Pi on one shape when that phase begins:

```
POST   /api/v1/auth/login | /register | /refresh
GET    /api/v1/exercises
GET    /api/v1/exercises/{id}
POST   /api/v1/exercises
GET    /api/v1/patterns
GET    /api/v1/patterns/{id}
POST   /api/v1/patterns
GET    /api/v1/devices
POST   /api/v1/devices/{id}/pair
GET    /api/v1/sessions
POST   /api/v1/sessions
POST   /api/v1/sessions/{id}/events      # telemetry ingestion, TelemetryEvent shape (src/types/telemetry.ts)
GET    /api/v1/sessions/{id}/metrics
GET    /api/v1/analytics/summary
POST   /api/v1/ai/coach                  # structured request in, structured recommendation out — never raw model creds on the client
```

The `TelemetryEvent` shape in `src/types/telemetry.ts` (schema-versioned,
zod-validated) is already written to be exactly what such a
`/sessions/{id}/events` endpoint would accept — the mock transport already
emits this shape, so wiring a real backend later is additive, not a UI
rewrite. `src/services/auth/types.ts`'s `AuthService` interface is the seam
for swapping `LocalAuthService` for a real backend-backed one when that
phase starts.
