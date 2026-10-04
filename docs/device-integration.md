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

## Finding the Pi by its BLE beacon

`src/app/devices/connect.tsx` ("Connect GymBeam") finds the Pi by the
Bluetooth Low Energy beacon it already broadcasts, then connects over the
same Bluetooth Classic link described above. The beacon is used for
discovery and proximity only — no drill data travels over BLE.

Flow: scan for beacons → user picks the GymBeam unit → pair it at the OS
level if it isn't already (`ensureBonded`, Android shows its own prompt) →
`setPairedDevice(address)` → `connect()`.

- `src/services/device-discovery/beaconParsing.ts` — pure, unit-tested
  decoding of iBeacon and Eddystone-UID frames, plus a rough distance
  estimate from signal strength.
- `src/services/device-discovery/beaconScanner.ts` — the real scanner
  (`react-native-ble-plx`) and a simulated one. The simulated scanner is used
  on iOS always and on Android when `EXPO_PUBLIC_ENABLE_MOCK_DEVICE=true`,
  same rule as the transports.
- `src/features/devices/useBeaconScan.ts` — permissions, scan lifecycle and
  the list of beacons currently in range.

**Recognising the GymBeam beacon.** Set `EXPO_PUBLIC_BEACON_UUID` to the
iBeacon proximity UUID the Pi advertises and only that beacon is listed.
With it unset the app can't tell a GymBeam beacon from any other, so it
lists every iBeacon/Eddystone beacon in range and marks one as GymBeam only
if its advertised name contains "GymBeam".

### Assumptions to confirm on real hardware

1. **The beacon's address is the Pi's Classic address.** The app connects
   Bluetooth Classic to the MAC address the beacon was seen on. That holds
   when the Pi advertises with its public address (BlueZ's default). If the
   Pi advertises with a random/private address, the connect step will fail
   and the beacon would need to carry the Classic MAC some other way (for
   example in major/minor, or a lookup by UUID). The "Pick from paired
   devices instead" link is the fallback until then.
2. **`BLUETOOTH_SCAN` must keep location access.** Do not set the BLE
   plugin's `neverForLocation` option: Android filters beacon advertisements
   out of scan results for apps that declare it. This is also why the screen
   asks for Location permission and needs Location turned on.
3. **Android only.** iOS doesn't expose iBeacon frames to this kind of scan,
   and has no real transport to connect to anyway.
4. **New Architecture.** `react-native-ble-plx` doesn't state New
   Architecture support; like `react-native-bluetooth-classic` below it is a
   plain native module, so it is expected to work through the interop layer
   but is unconfirmed until tested in a development build.

Adding `react-native-ble-plx` changed the native project, so a **new
development build is required** before real scanning works.

## Connecting over Wi-Fi

The Connect GymBeam screen also offers two network options, both using
`WifiTransport` (a WebSocket) instead of Bluetooth. They work on Android
**and iPhone**, and need no pairing.

- **Wi-Fi (shared network):** phone and Pi are both on the gym's Wi-Fi.
  Default address `gymbeam.local`. The network must allow client-to-client
  traffic — guest networks and "AP/client isolation" block it — and someone
  has to join the Pi to that network first.
- **Hotspot:** the Pi runs its own Wi-Fi network and the phone joins it.
  Default address `192.168.4.1`. The phone has no internet while joined.
  The user joins the network themselves in the phone's Wi-Fi settings; the
  app doesn't switch networks.

The address is editable on the screen (`host` or `host:port`, default port
8765) and is remembered as the chosen device.

### What the Pi must run (does not exist yet)

**The current firmware has no network server, so neither Wi-Fi option can
reach a real unit until this is added on the Pi side.**

- A WebSocket server on port **8765**, plain `ws://` (local network only).
- Each **text frame is exactly one JSON object** — the same commands and
  events listed at the top of this document (`Drill`, `Drill_preview`,
  `Drill_Stop`, `Time`; `device_info`, `system_info`, `Drill_result`).
  WebSocket frames replace the "no delimiter" problem Bluetooth has.
- On connect the app sends `Time` first, as it does over Bluetooth.
- For the shared-network option, advertise the hostname `gymbeam.local`
  (mDNS/Avahi), or give users the Pi's IP address. Android only resolves
  `.local` names on Android 12+; older phones need the IP.
- For the hotspot option, the Pi's access point should use a network name
  starting with `GymBeam` (the screen tells users to look for that) and the
  gateway address `192.168.4.1`. If the Pi's hotspot uses another address
  (NetworkManager defaults to `10.42.0.1`), change `DEFAULT_HOTSPOT_HOST` in
  `src/services/device-transport/wifiAddress.ts`.

App-side native settings this needed (so a **new development build** is
required): Android `usesCleartextTraffic` via `expo-build-properties`, and
on iOS `NSLocalNetworkUsageDescription` plus `NSAllowsLocalNetworking`.

## Architecture

`src/services/device-transport/`:
- `types.ts` — the `DeviceTransport` interface every implementation follows.
- `MockDeviceTransport.ts` — simulated device, used on iOS always and on
  Android when `EXPO_PUBLIC_ENABLE_MOCK_DEVICE=true`. Never touches hardware.
- `BluetoothClassicTransport.ts` — the real Android implementation.
- `WifiTransport.ts` — WebSocket transport for the Wi-Fi and hotspot options (both platforms).
- `wifiAddress.ts` — pure, unit-tested parsing of the Pi's `host:port` address.
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
5. In the app: **Devices → Find my GymBeam** → grant Bluetooth and Location
   permission when prompted → tap **Connect** on the GymBeam beacon (this
   pairs and connects). Fallback: **Pair a device** → select the Pi from the
   bonded-devices list.
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
