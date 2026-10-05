import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Badge, Button, Screen, ScreenHeader, Text, useTheme } from '@/design-system';
import { RunMap } from '@/features/runs/RunMap';
import { SAMPLE_RUNS, SAMPLE_SUMMARY } from '@/features/runs/sampleRunSession';
import { TargetTimesChart } from '@/features/runs/TargetTimesChart';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function MultiPointRunScreen() {
  const theme = useTheme();
  const [runIndex, setRunIndex] = useState(0);
  const run = SAMPLE_RUNS[runIndex]!;
  const summary = SAMPLE_SUMMARY;

  const card = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  };

  return (
    <Screen scroll padded={false}>
      <ScreenHeader
        title="Multi Point Run"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        trailing={<Badge label="Sample data" />}
      />

      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <RunSelector count={SAMPLE_RUNS.length} selected={runIndex} onSelect={setRunIndex} />
        <RunMap targets={run.targets} />

        <View
          style={[card, { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }]}
        >
          <View
            style={{
              alignItems: 'center',
              paddingRight: theme.spacing.md,
              borderRightWidth: 1,
              borderRightColor: theme.colors.border,
            }}
          >
            <MaterialCommunityIcons
              name="timer-outline"
              size={24}
              color={theme.colors.textSecondary}
            />
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              {'Speed\nkm/h'}
            </Text>
          </View>
          <SpeedValue
            icon="speedometer"
            color={theme.colors.target}
            label="High"
            value={run.speedKmph.high}
          />
          <SpeedValue
            icon="speedometer-medium"
            color={theme.colors.warning}
            label="Avg"
            value={run.speedKmph.avg}
            divider
          />
          <SpeedValue
            icon="speedometer-slow"
            color={theme.colors.danger}
            label="Low"
            value={run.speedKmph.low}
            divider
          />
        </View>

        <View style={[card, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
          <Text variant="bodyStrong">Time per target</Text>
          {/* Keyed by run so paging and selection reset when switching runs. */}
          <TargetTimesChart key={runIndex} timesSeconds={run.targetTimesSeconds} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
          <StatTile icon="run-fast" label="Runs" value={`${summary.runs}`} />
          <StatTile
            icon="map-marker-distance"
            label="Distance"
            value={`${summary.distanceKm} km`}
          />
          <StatTile icon="timer-sand" label="Active time" value={`${summary.activeTimeHours} h`} />
          <StatTile icon="speedometer" label="Speed" value={`${summary.avgSpeedKmph} km/h`} />
          <StatTile icon="sync" label="Consistency" value={`${summary.consistencyPercent}%`} />
          <StatTile icon="chart-bar" label="Reflex score" value={`${summary.reflexScore}`} />
        </View>

        <Button
          label="Detailed Analytics"
          variant="accent"
          size="lg"
          onPress={() => Alert.alert('Detailed Analytics', 'Detailed analytics are coming soon.')}
          fullWidth
        />
      </View>
    </Screen>
  );
}

function RunSelector({
  count,
  selected,
  onSelect,
}: {
  count: number;
  selected: number;
  onSelect: (index: number) => void;
}) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const chipOffsets = useRef<number[]>([]);

  const select = (index: number) => {
    onSelect(index);
    scrollRef.current?.scrollTo({
      x: Math.max(0, (chipOffsets.current[index] ?? 0) - 48),
      animated: true,
    });
  };

  const arrow = (direction: -1 | 1) => {
    const disabled = direction === -1 ? selected === 0 : selected === count - 1;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={direction === -1 ? 'Previous run' : 'Next run'}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => select(selected + direction)}
        style={{
          width: 48,
          alignSelf: 'stretch',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: direction === 1 ? `${theme.colors.target}26` : theme.colors.background,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Ionicons
          name={direction === -1 ? 'chevron-back' : 'chevron-forward'}
          size={22}
          color={direction === 1 ? theme.colors.link : theme.colors.textSecondary}
        />
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      {arrow(-1)}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.md, padding: theme.spacing.md }}
      >
        {Array.from({ length: count }, (_, index) => {
          const isSelected = index === selected;
          return (
            <Pressable
              key={index}
              accessibilityRole="tab"
              accessibilityLabel={`Run ${index + 1}`}
              accessibilityState={{ selected: isSelected }}
              onLayout={(event) => {
                chipOffsets.current[index] = event.nativeEvent.layout.x;
              }}
              onPress={() => select(index)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                minWidth: 48,
                height: 48,
                paddingHorizontal: theme.spacing.lg,
                justifyContent: 'center',
                borderRadius: theme.radius.full,
                borderWidth: 1,
                borderColor: isSelected ? theme.colors.target : theme.colors.border,
                backgroundColor: isSelected ? `${theme.colors.target}1F` : 'transparent',
              }}
            >
              {isSelected ? (
                <MaterialCommunityIcons name="source-commit" size={18} color={theme.colors.link} />
              ) : null}
              <Text
                variant="bodyStrong"
                style={{ color: isSelected ? theme.colors.link : theme.colors.textPrimary }}
              >
                {isSelected ? `Run ${index + 1}` : `${index + 1}`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {arrow(1)}
    </View>
  );
}

function SpeedValue({
  icon,
  color,
  label,
  value,
  divider = false,
}: {
  icon: IconName;
  color: string;
  label: string;
  value: number;
  divider?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        gap: theme.spacing.xxs,
        borderLeftWidth: divider ? 1 : 0,
        borderLeftColor: theme.colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
        <Text variant="caption" color="secondary">
          {label}
        </Text>
      </View>
      <Text variant="subtitle">{value}</Text>
    </View>
  );
}

function StatTile({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexBasis: '30%',
        flexGrow: 1,
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xs,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      <MaterialCommunityIcons name={icon} size={26} color={theme.colors.textSecondary} />
      <Text variant="caption" color="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="subtitle" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}
