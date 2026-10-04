import { useCallback, useEffect, useRef, useState } from 'react';

import { requestAndroidBluetoothPermissions } from '@/services/device-transport/androidBluetoothPermissions';
import {
  BeaconScanError,
  type BeaconScanErrorCode,
  type DiscoveredBeacon,
  createBeaconScanner,
} from '@/services/device-discovery/beaconScanner';

export type BeaconScanStatus =
  'idle' | 'starting' | 'scanning' | 'permission-denied' | BeaconScanErrorCode;

const FLUSH_INTERVAL_MS = 600;
const STALE_AFTER_MS = 8000;

function sortBeacons(beacons: DiscoveredBeacon[]): DiscoveredBeacon[] {
  return [...beacons].sort((a, b) => Number(b.isGymBeam) - Number(a.isGymBeam) || b.rssi - a.rssi);
}

export function useBeaconScan() {
  const [scanner] = useState(createBeaconScanner);
  const [status, setStatus] = useState<BeaconScanStatus>('idle');
  const [beacons, setBeacons] = useState<DiscoveredBeacon[]>([]);

  const seen = useRef(new Map<string, { beacon: DiscoveredBeacon; at: number }>());
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    scanner.stop();
    if (flushTimer.current) clearInterval(flushTimer.current);
    flushTimer.current = null;
    setStatus((current) => (current === 'scanning' || current === 'starting' ? 'idle' : current));
  }, [scanner]);

  const start = useCallback(async () => {
    setStatus('starting');
    seen.current.clear();
    setBeacons([]);

    const granted = await requestAndroidBluetoothPermissions();
    if (!granted) {
      setStatus('permission-denied');
      return;
    }

    try {
      await scanner.start(
        (beacon) => seen.current.set(beacon.address, { beacon, at: Date.now() }),
        (error) => {
          scanner.stop();
          setStatus(error.code);
        },
      );
    } catch (error) {
      setStatus(error instanceof BeaconScanError ? error.code : 'unknown');
      return;
    }

    if (flushTimer.current) clearInterval(flushTimer.current);
    flushTimer.current = setInterval(() => {
      const cutoff = Date.now() - STALE_AFTER_MS;
      for (const [address, entry] of seen.current) {
        if (entry.at < cutoff) seen.current.delete(address);
      }
      setBeacons(sortBeacons(Array.from(seen.current.values(), (entry) => entry.beacon)));
    }, FLUSH_INTERVAL_MS);
    setStatus('scanning');
  }, [scanner]);

  useEffect(() => {
    queueMicrotask(start);
    return stop;
  }, [start, stop]);

  return { status, beacons, start, stop, isMock: scanner.isMock };
}
