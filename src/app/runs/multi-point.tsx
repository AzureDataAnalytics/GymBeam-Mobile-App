import { Alert } from 'react-native';

import { Button } from '@/design-system';
import { RunSessionView } from '@/features/runs/RunSessionView';
import { SAMPLE_RUNS, SAMPLE_SUMMARY } from '@/features/runs/sampleRunSession';

export default function MultiPointRunScreen() {
  const summary = SAMPLE_SUMMARY;

  return (
    <RunSessionView
      title="Multi Point Run"
      badgeLabel="Sample data"
      runs={SAMPLE_RUNS}
      stats={[
        { icon: 'target', label: 'Runs', value: `${summary.runs}` },
        { icon: 'map-marker-path', label: 'Distance', value: `${summary.distanceKm} km` },
        { icon: 'timer-sand', label: 'Active time', value: `${summary.activeTimeHours} h` },
        { icon: 'gauge', label: 'Speed', value: `${summary.avgSpeedKmph} km/h` },
        { icon: 'sync', label: 'Consistency', value: `${summary.consistencyPercent}%` },
        { icon: 'chart-bar', label: 'Reflex score', value: `${summary.reflexScore}` },
      ]}
      footer={
        <Button
          label="Detailed Analytics"
          variant="accent"
          size="lg"
          onPress={() => Alert.alert('Detailed Analytics', 'Detailed analytics are coming soon.')}
          fullWidth
        />
      }
    />
  );
}
