import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text, useTheme } from '@/design-system';

export const TARGETS_PER_PAGE = 6;

const PLOT_HEIGHT = 110;
const MIN_BAR_HEIGHT = 4;

type TargetTimesChartProps = {
  timesSeconds: number[];
};

export function TargetTimesChart({ timesSeconds }: TargetTimesChartProps) {
  const theme = useTheme();
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(timesSeconds.length / TARGETS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const firstIndex = currentPage * TARGETS_PER_PAGE;
  const pageTimes = timesSeconds.slice(firstIndex, firstIndex + TARGETS_PER_PAGE);
  // Keep the y-scale fixed across pages so heights stay comparable.
  const maxTime = Math.max(...timesSeconds, 0.1);

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          {pageTimes.map((seconds, slot) => (
            <View
              key={firstIndex + slot}
              accessible
              accessibilityLabel={`Target ${firstIndex + slot + 1}: ${seconds} seconds`}
              style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}
            >
              <Text variant="label">{`${seconds.toFixed(2)}s`}</Text>
              <View
                style={{
                  width: '56%',
                  height: Math.max(MIN_BAR_HEIGHT, (seconds / maxTime) * PLOT_HEIGHT),
                  borderTopLeftRadius: theme.radius.sm,
                  borderTopRightRadius: theme.radius.sm,
                  backgroundColor: theme.colors.target,
                }}
              />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', marginTop: theme.spacing.sm }}>
          {pageTimes.map((_, slot) => (
            <Text
              key={firstIndex + slot}
              variant="label"
              color="secondary"
              style={{ flex: 1, textAlign: 'center', fontWeight: '400' }}
            >
              {`T${firstIndex + slot + 1}`}
            </Text>
          ))}
        </View>
      </View>

      {pageCount > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.lg }}>
          <PageButton
            icon="chevron-back"
            label="Previous targets"
            disabled={currentPage === 0}
            onPress={() => setPage(currentPage - 1)}
          />
          <PageButton
            icon="chevron-forward"
            label="Next targets"
            disabled={currentPage >= pageCount - 1}
            onPress={() => setPage(currentPage + 1)}
          />
        </View>
      ) : null}
    </View>
  );
}

function PageButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.accent,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={theme.colors.onAccent} />
    </Pressable>
  );
}
