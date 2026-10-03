import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Text, useTheme } from '@/design-system';

export const TARGETS_PER_PAGE = 6;

const PLOT_HEIGHT = 150;
const LABEL_SPACE = 28; // above the highest point, for its value label
const SIDE_PADDING = 18;

interface TargetTimesChartProps {
  timesSeconds: number[];
}


export function TargetTimesChart({ timesSeconds }: TargetTimesChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const pageCount = Math.max(1, Math.ceil(timesSeconds.length / TARGETS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const firstIndex = currentPage * TARGETS_PER_PAGE;
  const pageTimes = timesSeconds.slice(firstIndex, firstIndex + TARGETS_PER_PAGE);
  // Keep the y-scale fixed across pages so heights stay comparable.
  const maxTime = Math.max(...timesSeconds, 0.1);

  const slotWidth = (width - SIDE_PADDING * 2) / TARGETS_PER_PAGE;
  const xFor = (slot: number) => SIDE_PADDING + slotWidth * (slot + 0.5);
  const yFor = (seconds: number) =>
    LABEL_SPACE + (PLOT_HEIGHT - LABEL_SPACE) * (1 - seconds / maxTime);
  const points = pageTimes.map((seconds, slot) => ({ x: xFor(slot), y: yFor(seconds), seconds }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath =
    points.length > 1
      ? `${linePath} L${points[points.length - 1]!.x},${PLOT_HEIGHT} L${points[0]!.x},${PLOT_HEIGHT} Z`
      : '';
  const selectedSlot = selected === null ? null : selected - firstIndex;

  const changePage = (delta: number) => {
    setPage(currentPage + delta);
    setSelected(null);
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={PLOT_HEIGHT} accessibilityElementsHidden>
            <Defs>
              <LinearGradient id="timesArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.colors.target} stopOpacity={0.3} />
                <Stop offset="1" stopColor={theme.colors.target} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {areaPath ? <Path d={areaPath} fill="url(#timesArea)" /> : null}
            <Path d={linePath} stroke={theme.colors.target} strokeWidth={2} fill="none" />

            {selectedSlot !== null && points[selectedSlot] ? (
              <Line
                x1={points[selectedSlot].x}
                y1={points[selectedSlot].y}
                x2={points[selectedSlot].x}
                y2={PLOT_HEIGHT}
                stroke={theme.colors.target}
                strokeOpacity={0.5}
                strokeDasharray="4 4"
              />
            ) : null}

            {points.map((p, slot) => {
              const isSelected = slot === selectedSlot;
              return (
                <Circle
                  key={`pt${slot}`}
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 6 : 4}
                  fill={theme.colors.target}
                  stroke={theme.colors.surface}
                  strokeWidth={2}
                />
              );
            })}
            {points.map((p, slot) => (
              <SvgText
                key={`lb${slot}`}
                x={p.x}
                y={p.y - 12}
                fontSize={13}
                fontWeight={slot === selectedSlot ? '700' : '400'}
                fill={theme.colors.textSecondary}
                textAnchor="middle"
              >
                {`${p.seconds}s`}
              </SvgText>
            ))}
          </Svg>
        ) : (
          <View style={{ height: PLOT_HEIGHT }} />
        )}
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: SIDE_PADDING }}>
        {Array.from({ length: TARGETS_PER_PAGE }, (_, slot) => {
          const index = firstIndex + slot;
          const exists = index < timesSeconds.length;
          return (
            <View key={slot} style={{ flex: 1, alignItems: 'center' }}>
              {exists ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Target ${index + 1}: ${timesSeconds[index]} seconds`}
                  accessibilityState={{ selected: selected === index }}
                  hitSlop={8}
                  onPress={() => setSelected(selected === index ? null : index)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: theme.radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.target,
                    borderWidth: selected === index ? 2 : 0,
                    borderColor: theme.colors.accent,
                  }}
                >
                  <Text variant="label" style={{ color: theme.colors.onAccent }}>
                    {index + 1}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.lg }}>
        <PageButton
          icon="chevron-back"
          label="Previous targets"
          disabled={currentPage === 0}
          onPress={() => changePage(-1)}
        />
        <PageButton
          icon="chevron-forward"
          label="Next targets"
          disabled={currentPage >= pageCount - 1}
          onPress={() => changePage(1)}
        />
      </View>
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
