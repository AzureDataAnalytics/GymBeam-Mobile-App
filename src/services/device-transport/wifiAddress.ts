export const DEFAULT_WIFI_PORT = 8765;
export const DEFAULT_SHARED_WIFI_HOST = 'gymbeam.local';
export const DEFAULT_HOTSPOT_HOST = '192.168.4.1';

export interface WifiEndpoint {
  host: string;
  port: number;
}

const HOSTNAME =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

export function parseWifiAddress(input: string): WifiEndpoint | null {
  const trimmed = input
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/\/.*$/, '');
  if (!trimmed) return null;

  const [host, portText, ...rest] = trimmed.split(':');
  if (!host || rest.length > 0 || !HOSTNAME.test(host)) return null;

  if (portText === undefined) return { host: host.toLowerCase(), port: DEFAULT_WIFI_PORT };

  const port = Number(portText);
  if (!/^\d+$/.test(portText) || port < 1 || port > 65535) return null;
  return { host: host.toLowerCase(), port };
}

export function formatWifiAddress(endpoint: WifiEndpoint): string {
  return `${endpoint.host}:${endpoint.port}`;
}

export function toWebSocketUrl(endpoint: WifiEndpoint): string {
  return `ws://${endpoint.host}:${endpoint.port}`;
}
