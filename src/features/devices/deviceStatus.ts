import type { BadgeTone } from '@/design-system';
import type { DeviceConnectionState } from '@/types/domain';

export const DEVICE_STATUS_LABEL: Record<DeviceConnectionState, string> = {
  offline: 'Offline',
  connecting: 'Connecting…',
  online: 'Online',
  ready: 'Ready',
  busy: 'Running',
  warning: 'Warning',
  error: 'Error',
  emergency_stop: 'Emergency stop',
  unsupported: 'Not supported on this device',
};

export const DEVICE_STATUS_TONE: Record<DeviceConnectionState, BadgeTone> = {
  offline: 'neutral',
  connecting: 'tint',
  online: 'success',
  ready: 'success',
  busy: 'tint',
  warning: 'warning',
  error: 'danger',
  emergency_stop: 'danger',
  unsupported: 'neutral',
};
