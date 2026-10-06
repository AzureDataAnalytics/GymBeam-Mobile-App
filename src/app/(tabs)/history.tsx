import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, View } from 'react-native';

import { Badge, EmptyState, LoadingState, Screen, Text, useTheme } from '@/design-system';
import { formatDuration, summarizeSession } from '@/features/history/drillStats';
import { useHistoryStore } from '@/state/historyStore';
import { HISTORY_RETENTION_DAYS, pruneExpired } from '@/storage/drillHistoryStorage';
import type { DrillSessionRecord } from '@/types/domain';

type DaySection = {
  title: string;
  data: DrillSessionRecord[];
};

function groupByDay(sessions: DrillSessionRecord[]): DaySection[] {
  const sections: DaySection[] = [];
  for (const session of sessions) {
    const title = new Date(session.startedAt).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const last = sections[sections.length - 1];
    if (last?.title === title) {
      last.data.push(session);
    } else {
      sections.push({ title, data: [session] });
    }
  }
  return sections;
}

function SessionRow({ session }: { session: DrillSessionRecord }) {
  const theme = useTheme();
  const summary = summarizeSession(session);
  const time = new Date(session.startedAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const details = `${summary.runs} ${summary.runs === 1 ? 'run' : 'runs'} · ${session.targets.length} targets · ${formatDuration(summary.activeSeconds)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${session.name}, ${time}, ${details}`}
      onPress={() => router.push({ pathname: '/runs/[id]', params: { id: session.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        opacity: pressed ? 0.85 : 1,
        ...theme.shadow.sm,
      })}
    >
      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {session.name}
          </Text>
          {session.isMock ? <Badge label="Mock" /> : null}
        </View>
        <Text variant="caption" color="secondary">
          {`${time} · ${details}`}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

export default function HistoryScreen() {
  const theme = useTheme();
  const isLoaded = useHistoryStore((state) => state.isLoaded);
  const sessions = useHistoryStore((state) => state.sessions);
  // Re-check the window on render, so an app left open still drops day 31.
  const sections = useMemo(() => groupByDay(pruneExpired(sessions)), [sessions]);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={{ gap: theme.spacing.xxs, marginBottom: theme.spacing.lg }}>
        <Text variant="title">History</Text>
        <Text variant="caption" color="secondary">
          {`Last ${HISTORY_RETENTION_DAYS} days · saved on this phone`}
        </Text>
      </View>

      {!isLoaded ? (
        <LoadingState />
      ) : sections.length === 0 ? (
        <EmptyState
          title="No drills yet"
          description={`Drills you run are saved here for ${HISTORY_RETENTION_DAYS} days.`}
          actionLabel="Start a drill"
          onAction={() => router.push('/(tabs)/drill')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(session) => session.id}
          renderItem={({ item }) => <SessionRow session={item} />}
          renderSectionHeader={({ section }) => (
            <Text
              variant="label"
              color="secondary"
              style={{
                paddingVertical: theme.spacing.sm,
                backgroundColor: theme.colors.background,
              }}
            >
              {section.title.toUpperCase()}
            </Text>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}
