import {
  DEFAULT_WIFI_PORT,
  formatWifiAddress,
  parseWifiAddress,
  toWebSocketUrl,
} from '@/services/device-transport/wifiAddress';

describe('wifiAddress', () => {
  it('parses a host and applies the default port', () => {
    expect(parseWifiAddress('gymbeam.local')).toEqual({
      host: 'gymbeam.local',
      port: DEFAULT_WIFI_PORT,
    });
    expect(parseWifiAddress(' 192.168.4.1 ')).toEqual({
      host: '192.168.4.1',
      port: DEFAULT_WIFI_PORT,
    });
  });

  it('parses an explicit port and tolerates a pasted URL', () => {
    expect(parseWifiAddress('192.168.1.20:9000')).toEqual({ host: '192.168.1.20', port: 9000 });
    expect(parseWifiAddress('ws://GymBeam.local:8765/socket')).toEqual({
      host: 'gymbeam.local',
      port: 8765,
    });
  });

  it('rejects empty, malformed and out-of-range input', () => {
    expect(parseWifiAddress('')).toBeNull();
    expect(parseWifiAddress('not a host')).toBeNull();
    expect(parseWifiAddress('host:abc')).toBeNull();
    expect(parseWifiAddress('host:0')).toBeNull();
    expect(parseWifiAddress('host:70000')).toBeNull();
    expect(parseWifiAddress('a:1:2')).toBeNull();
  });

  it('formats an endpoint as an address and a WebSocket URL', () => {
    const endpoint = { host: '192.168.4.1', port: 8765 };
    expect(formatWifiAddress(endpoint)).toBe('192.168.4.1:8765');
    expect(toWebSocketUrl(endpoint)).toBe('ws://192.168.4.1:8765');
  });
});
