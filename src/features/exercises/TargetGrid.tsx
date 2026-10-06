import { useState } from 'react';
import { type GestureResponderEvent, Pressable, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/design-system';
import type { TargetPoint } from '@/types/domain';

import { METER_GRID_LABEL_GUTTER as LABEL_GUTTER, MeterGridLines } from './MeterGridLines';
import { GRID_COLUMNS, GRID_ROWS, findTargetNear, snapToGrid } from './targetGeometry';

const EDGE_PADDING = 16;

type TargetGridProps = {
  targets: TargetPoint[];
  selectedIndex: number | null;
  onAddTarget: (point: TargetPoint) => void;
  onSelectTarget: (index: number) => void;
  onRemoveTarget: (index: number) => void;
};

export function TargetGrid({
  targets,
  selectedIndex,
  onAddTarget,
  onSelectTarget,
  onRemoveTarget,
}: TargetGridProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const cell = Math.max(0, (width - LABEL_GUTTER - EDGE_PADDING) / GRID_COLUMNS);
  const gridLeft = LABEL_GUTTER;
  const gridTop = LABEL_GUTTER;
  const gridWidth = cell * GRID_COLUMNS;
  const gridHeight = cell * GRID_ROWS;
  const height = gridTop + gridHeight + EDGE_PADDING;
  const targetRadius = cell * 0.3;
  const deviceSize = cell * 0.34;

  const toScreen = (point: TargetPoint) => ({
    cx: gridLeft + gridWidth / 2 + point.x * cell,
    cy: gridTop + point.y * cell,
  });
  const toMeters = (event: GestureResponderEvent): TargetPoint => ({
    x: (event.nativeEvent.locationX - gridLeft - gridWidth / 2) / cell,
    y: (event.nativeEvent.locationY - gridTop) / cell,
  });
  const hitIndex = (point: TargetPoint) => findTargetNear(targets, point, 0.4);

  const handlePress = (event: GestureResponderEvent) => {
    if (cell === 0) return;
    const raw = toMeters(event);
    const hit = hitIndex(raw);
    if (hit !== -1) {
      onSelectTarget(hit);
      return;
    }
    const snapped = snapToGrid(raw);
    const existing = hitIndex(snapped);
    if (existing !== -1) {
      onSelectTarget(existing);
    } else if (snapped.x !== 0 || snapped.y !== 0) {
      onAddTarget(snapped);
    }
  };

  const handleLongPress = (event: GestureResponderEvent) => {
    if (cell === 0) return;
    const hit = hitIndex(toMeters(event));
    if (hit !== -1) onRemoveTarget(hit);
  };

  const device = toScreen({ x: 0, y: 0 });
  const selectedTarget = selectedIndex === null ? undefined : targets[selectedIndex];

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <>
          <Svg width={width} height={height} pointerEvents="none">
            <MeterGridLines
              columns={GRID_COLUMNS}
              rows={GRID_ROWS}
              cell={cell}
              left={gridLeft}
              top={gridTop}
            />

            {targets.map((target, i) => {
              const from = i === 0 ? device : toScreen(targets[i - 1]!);
              const to = toScreen(target);
              return (
                <Line
                  key={`p${i}`}
                  x1={from.cx}
                  y1={from.cy}
                  x2={to.cx}
                  y2={to.cy}
                  stroke={theme.colors.target}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              );
            })}

            <Rect
              x={device.cx - deviceSize / 2}
              y={device.cy - deviceSize / 2}
              width={deviceSize}
              height={deviceSize}
              rx={4}
              fill={theme.colors.textPrimary}
            />

            {selectedTarget ? (
              <Circle
                cx={toScreen(selectedTarget).cx}
                cy={toScreen(selectedTarget).cy}
                r={targetRadius + 5}
                fill={theme.colors.surface}
                stroke={theme.colors.accent}
                strokeWidth={3}
              />
            ) : null}

            {targets.map((target, index) => {
              const { cx, cy } = toScreen(target);
              return (
                <Circle
                  key={`t${index}`}
                  cx={cx}
                  cy={cy}
                  r={targetRadius}
                  fill={theme.colors.targetStrong}
                />
              );
            })}
            {targets.map((target, index) => {
              const { cx, cy } = toScreen(target);
              return (
                <SvgText
                  key={`n${index}`}
                  x={cx}
                  y={cy + 5}
                  fontSize={15}
                  fontWeight="600"
                  fill={theme.colors.onAccent}
                  textAnchor="middle"
                >
                  {index + 1}
                </SvgText>
              );
            })}
          </Svg>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Target grid, ${targets.length} targets placed`}
            accessibilityHint="Tap to add a target, long-press a target to remove it"
            onPress={handlePress}
            onLongPress={handleLongPress}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </>
      ) : null}
    </View>
  );
}
