import { FlatList, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Screen, Text, useTheme } from '@/design-system';
import type { TargetPoint } from '@/types/domain';
import { useDeviceStore } from '@/state/deviceStore';
import type { TelemetryEvent } from '@/types/telemetry';

const DEMO_TARGETS: TargetPoint[] = [
  { x: 1, y: 1 },
  { x: -1, y: 1.5 },
  { x: 0, y: 2 },
  { x: 1.5, y: -1 },
  { x: -1.5, y: -1 },
];

const SESSION_STATE_LABEL: Record<string, string> = {
  idle: 'Idle',
  preparing: 'Preparing',
  ready: 'Ready',
  countdown: 'Starting…',
  running: 'Running',
  paused: 'Paused',
  stopping: 'Stopping…',
  completed: 'Completed',
  error: 'Error',
  disconnected: 'Disconnected',
  emergency_stop: 'Emergency stop',
};

function TelemetryRow({ event }: { event: TelemetryEvent }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Text variant="caption">{event.eventType.replaceAll('_', ' ')}</Text>
      <Text variant="caption" color="secondary">
        {new Date(event.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );
}

export default function SessionsScreen() {
  const theme = useTheme();
  const connectionState = useDeviceStore((state) => state.connectionState);
  const sessionState = useDeviceStore((state) => state.sessionState);
  const telemetryLog = useDeviceStore((state) => state.telemetryLog);
  const sendDrill = useDeviceStore((state) => state.sendDrill);
  const stopDrill = useDeviceStore((state) => state.stopDrill);

  const canStart = connectionState === 'ready';
  const isRunning = sessionState === 'running';

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg, flex: 1 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text variant="title">Sessions</Text>
          <Badge
            label={SESSION_STATE_LABEL[sessionState] ?? sessionState}
            tone={isRunning ? 'tint' : 'neutral'}
          />
        </View>

        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="subtitle">Demo drill</Text>
          <Text variant="caption" color="secondary">
            Runs a 5-target sequence against the connected device (mock or real) to exercise the
            full telemetry pipeline end to end.
          </Text>
          {!canStart && !isRunning ? (
            <Text variant="caption" color="warning">
              Connect a device from the Devices tab first.
            </Text>
          ) : null}
          <Button
            label={isRunning ? 'Stop drill' : 'Start demo drill'}
            variant={isRunning ? 'danger' : 'primary'}
            disabled={!canStart && !isRunning}
            onPress={() =>
              isRunning ? stopDrill() : sendDrill({ name: 'Demo drill', targets: DEMO_TARGETS })
            }
            fullWidth
          />
        </Card>

        <View style={{ flex: 1 }}>
          <Text variant="label" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
            LIVE TELEMETRY
          </Text>
          {telemetryLog.length === 0 ? (
            <EmptyState
              title="No telemetry yet"
              description="Start a drill to see live session events stream in here."
            />
          ) : (
            <FlatList
              data={telemetryLog}
              keyExtractor={(event) => event.eventId}
              renderItem={({ item }) => <TelemetryRow event={item} />}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
