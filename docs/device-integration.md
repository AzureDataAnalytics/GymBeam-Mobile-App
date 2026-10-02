# Device integration

## Status: real Android transport is implemented, ready for a hardware test

`BluetoothClassicTransport` is wired up and connects to the Pi's *existing,
unmodified* firmware — no Pi-side changes needed. It hasn't been run against
real hardware yet (that requires a physical phone + a dev build, neither of
which exist in the environment this was built in) — see "First real test"
below for exactly how to do that.

## The Raspberry Pi's real protocol

Source of truth: `GymBeamDevice/3B-WorkingCode/blu.py` and `main.py` (sibling
repo, not part of this app). The Pi runs a **classic Bluetooth RFCOMM/SPP**
server:

- Service UUID: `00001101-0000-1000-8000-00805f9b34fb` (standard SPP UUID)
- Wire format: JSON objects with **no delimiter** between messages
  (`client_socket.send(json.dumps(dic).encode('utf-8'))` — nothing appended)
- Commands the phone sends (built in `src/services/device-transport/piProtocol.ts`):
  ```jsonc
  { "command": "Drill", "name": "drill_test", "coordinateCount": 3, "cordinates": [[x, y], ...] }
  { "command": "Drill_preview", "name": "drill_test", "coordinateCount": 3, "cordinates": [[x, y], ...] }
  { "command": "Drill_Stop" }
  { "command": "Time", "year": "2026", "month": "9", "date": "21", "hour": "14", "minutes": "30", "second": "0" }
  ```
  Coordinates are in meters within the training area (an 8m-diameter circle,
  4m radius — see `AppConfigData` in the legacy Flutter app). The Pi converts
  them to servo angles itself (`blu.py::_calAngles`) — the phone never sends
  raw angles, and never touches GPIO/I2C directly (spec section 1 holds).
- Events the Pi sends back (parsed in `piProtocol.ts::parsePiMessage`):
  ```jsonc
  { "type": "device_info", "device_id": "...", "device_name": "...", "mac_addr": "...", "device_manufature": "..." }
  { "type": "system_info", "cpuUsage": ..., "memoryUsage": ..., "diskUsage": ..., "temperature": ..., "uptime": ... } // every 60s
  { "type": "Drill_result", "name": "...", "coordinateCount": N, "point0": <seconds>, "point1": <seconds>, ... }
  ```

### Two real firmware limitations (not bugs in this app)

1. **No delimiter between messages.** `react-native-bluetooth-classic`'s
   default "delimited" mode would buffer forever waiting for a `\n` that
   never arrives. This app connects with `{ connectionType: 'delimited',
   delimiter: '' }` — verified against the library's own docs
   (`docs/src/docs/android/device-connection.mdx` in its GitHub repo, not
   assumed) as an explicit opt-in that disables delimiter buffering and just
   forwards raw bytes. `JsonStreamFramer`
   (`src/services/device-transport/jsonFraming.ts`, unit tested) then
   reassembles complete JSON objects from that raw stream, handling
   split/concatenated messages. **No Pi-firmware change was needed.**
2. **No acknowledgment for start or stop.** The Pi never sends a reply to a
   `Drill` or `Drill_Stop` command — `main.py`'s only outbound message is
   `Drill_result`, sent once per completed lap. So `SESSION_STARTED` and
   `SESSION_STOPPED` in this app are **optimistic**: fired once the write to
   the socket succeeds, not once hardware confirms. Also, the Pi's drill
   loop **repeats forever** until `Drill_Stop` arrives — it doesn't stop
   after one pass through the targets — which is why a `Drill_result` maps
   to `ROUND_COMPLETED` (one lap), not `SESSION_COMPLETED`.
   A real firmware enhancement (out of scope here, but worth doing on the
   `GymBeamDevice` side) would be to send an explicit ack for both commands
   so the app can reflect true hardware state per spec section 16 instead of
   this optimistic compromise.

## Why iOS can't use this

iOS's CoreBluetooth framework only exposes BLE GATT services or MFi-certified
External Accessories to third-party apps — there is no API for opening a
classic RFCOMM/SPP socket to an arbitrary device, which is exactly what the
Pi runs. This is a platform restriction, not a library gap. The legacy
Flutter app only worked on Android because its Bluetooth code was a
hand-written Android `MethodChannel`; there was never an iOS implementation.
`createDeviceTransport.ts` always returns `MockDeviceTransport` on iOS.

## Architecture

`src/services/device-transport/`:
- `types.ts` — the `DeviceTransport` interface every implementation follows.
- `MockDeviceTransport.ts` — simulated device, used on iOS always and on
  Android when `EXPO_PUBLIC_ENABLE_MOCK_DEVICE=true`. Never touches hardware.
- `BluetoothClassicTransport.ts` — the real Android implementation.
- `jsonFraming.ts` — pure, unit-tested stream reassembly (see above).
- `piProtocol.ts` — pure, unit-tested command builders + response parsers/normalizers.
- `nativeBluetooth.ts` — lists OS-bonded devices (for the pairing screen).
- `androidBluetoothPermissions.ts` — requests `BLUETOOTH_CONNECT`/`BLUETOOTH_SCAN`/`ACCESS_FINE_LOCATION` at runtime.
- `createDeviceTransport.ts` — picks Mock vs. real per platform/env/pairing state.

`src/state/deviceStore.ts` holds the active transport, re-creating and
re-subscribing it whenever `setPairedDevice()` is called (from
`src/app/devices/pair.tsx`), and persists the paired MAC address via
`src/storage/deviceStorage.ts` (AsyncStorage — a MAC address isn't sensitive,
so it doesn't need SecureStore).

### Known risk to watch for during the real test

`react-native-bluetooth-classic` is flagged by React Native Directory as
**untested (not confirmed broken) on the New Architecture**, which Expo SDK
57 enables by default with no opt-out. It's a plain NativeModule (events +
methods, no custom Fabric UI component), which is exactly the shape the New
Architecture's interop layer supports best — so it's likely fine, but this
hasn't been confirmed against a real device yet. If the dev build crashes or
the native module fails to load, this is the first thing to suspect; the
`expo.doctor.reactNativeDirectoryCheck.exclude` entry in `package.json`
suppresses the warning but doesn't remove the underlying risk.

## First real test — step by step

1. **Pair the Pi at the OS level first.** On the Android phone: Settings →
   Bluetooth → pair with the GymBeam unit (same prerequisite the legacy
   Flutter app had — this app only picks among already-bonded devices, it
   doesn't do discovery/pairing itself).
2. **Build a development client** (one-time, or whenever native deps
   change): `eas build --profile development --platform android`. Requires
   `eas login` first. This is a cloud build — no Android Studio needed.
3. **Install the resulting build** on the physical Android phone (EAS gives
   you a link/QR code to download the APK).
4. **Set `EXPO_PUBLIC_ENABLE_MOCK_DEVICE=false`** in `.env`, then
   `npx expo start --dev-client` and open the app from the installed build
   (not Expo Go).
5. In the app: **Devices tab → Pair a device** → grant Bluetooth permission
   when prompted → select the Pi from the bonded-devices list.
6. **Devices tab → Connect.** This sends the `Time` handshake automatically;
   watch for the state moving to `ready`.
7. **Sessions tab → Start demo drill.** This should move the Pi's laser
   through the 5 demo targets and stream `ROUND_COMPLETED` telemetry back
   after each lap; **Stop drill** sends `Drill_Stop`.

If step 6 or 7 fails, check (in order): Bluetooth is on, the Pi is powered
and its Bluetooth service is running (`GymBeamDevice`'s `main.py`), the
phone has an active OS-level pairing (not just "seen," but "paired"), and
the app's logs (`npx expo start --dev-client` terminal) for whatever
`createLogger('device.bluetoothClassic')` printed.
