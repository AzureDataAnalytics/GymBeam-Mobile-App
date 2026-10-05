import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/design-system';
import { MeterGridLines } from '@/features/exercises/MeterGridLines';
import type { TargetPoint } from '@/types/domain';

const GRID_COLUMNS = 8;
const GRID_ROWS = 6;

export function RunMap({ targets }: { targets: TargetPoint[] }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const cell = width / GRID_COLUMNS;
  const height = cell * GRID_ROWS;
  const centerX = width / 2;
  const centerY = height / 2;
  const markerRadius = Math.max(12, cell * 0.34);
  const deviceSize = cell * 0.4;

  const toScreen = (point: TargetPoint) => ({
    cx: centerX + point.x * cell,
    cy: centerY - point.y * cell,
  });
  const path = [{ x: 0, y: 0 }, ...targets].map(toScreen);

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ aspectRatio: GRID_COLUMNS / GRID_ROWS }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Run map with ${targets.length} targets around the device`}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <MeterGridLines
            columns={GRID_COLUMNS}
            rows={GRID_ROWS}
            cell={cell}
            left={0}
            top={0}
            originRow={GRID_ROWS / 2}
            showLabels={false}
          />

          {path.slice(1).map((to, i) => (
            <Line
              key={`p${i}`}
              x1={path[i]!.cx}
              y1={path[i]!.cy}
              x2={to.cx}
              y2={to.cy}
              stroke={theme.colors.target}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}

          <Rect
            x={centerX - deviceSize / 2}
            y={centerY - deviceSize / 2}
            width={deviceSize}
            height={deviceSize}
            rx={4}
            fill={theme.colors.textPrimary}
          />

          {path.slice(1).map(({ cx, cy }, index) => (
            <Circle
              key={`t${index}`}
              cx={cx}
              cy={cy}
              r={markerRadius}
              fill={theme.colors.targetStrong}
            />
          ))}
          {path.slice(1).map(({ cx, cy }, index) => (
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
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
