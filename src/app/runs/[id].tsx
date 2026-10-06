import { router, useLocalSearchParams } from 'expo-router';

import { EmptyState, LoadingState, Screen } from '@/design-system';
import {
  formatDistance,
  formatDuration,
  runSpeedKmph,
  summarizeSession,
} from '@/features/history/drillStats';
import { RunSessionView } from '@/features/runs/RunSessionView';
import { useHistoryStore } from '@/state/historyStore';

export default function RecordedRunScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isLoaded = useHistoryStore((state) => state.isLoaded);
  const session = useHistoryStore((state) => state.sessions.find((s) => s.id === id));

  if (!session) {
    return (
      <Screen>
        {isLoaded ? (
          <EmptyState
            title="Drill not found"
            description="It may be older than 30 days, which is as far back as history goes."
            actionLabel="Back to history"
            onAction={() => router.replace('/(tabs)/history')}
          />
        ) : (
          <LoadingState />
        )}
      </Screen>
    );
  }

  const summary = summarizeSession(session);

  return (
    <RunSessionView
      title={session.name}
      badgeLabel={session.isMock ? 'Mock device' : undefined}
      runs={session.runs.map((run) => ({
        targets: session.targets,
        targetTimesSeconds: run.targetTimesSeconds,
        speedKmph: runSpeedKmph(session.targets, run),
      }))}
      stats={[
        { icon: 'run-fast', label: 'Runs', value: `${summary.runs}` },
        {
          icon: 'map-marker-distance',
          label: 'Distance',
          value: formatDistance(summary.distanceMeters),
        },
        { icon: 'timer-sand', label: 'Active time', value: formatDuration(summary.activeSeconds) },
        { icon: 'speedometer', label: 'Speed', value: `${summary.avgSpeedKmph} Kmph` },
        {
          icon: 'timer-outline',
          label: 'Fastest target',
          value: summary.fastestTargetSeconds === null ? '–' : `${summary.fastestTargetSeconds} s`,
        },
        { icon: 'target-variant', label: 'Missed', value: `${summary.missedTargets}` },
      ]}
    />
  );
}
