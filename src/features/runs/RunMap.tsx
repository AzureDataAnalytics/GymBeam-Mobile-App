import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/design-system';
import {
  METER_GRID_LABEL_GUTTER as LABEL_GUTTER,
  MeterGridLines,
} from '@/features/exercises/MeterGridLines';
import type { TargetPoint } from '@/types/domain';

const DEVICE_RANGE_METERS = 4;
const GRID_CELLS = DEVICE_RANGE_METERS * 2;
const EDGE_PADDING = 16;


export function RunMap({ targets }: { targets: TargetPoint[] }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const cell = Math.max(0, (width - LABEL_GUTTER - EDGE_PADDING) / GRID_CELLS);
  const gridSize = cell * GRID_CELLS;
  const height = LABEL_GUTTER + gridSize + EDGE_PADDING;
  const centerX = LABEL_GUTTER + gridSize / 2;
  const centerY = LABEL_GUTTER + gridSize / 2;
  const markerRadius = Math.max(12, cell * 0.42);

  const toScreen = (point: TargetPoint) => ({
    cx: centerX + point.x * cell,
    cy: centerY - point.y * cell,
  });
  const path = [{ x: 0, y: 0 }, ...targets].map(toScreen);

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Run map with ${targets.length} targets around the device`}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <MeterGridLines
            columns={GRID_CELLS}
            rows={GRID_CELLS}
            cell={cell}
            left={LABEL_GUTTER}
            top={LABEL_GUTTER}
          />

          <Circle
            cx={centerX}
            cy={centerY}
            r={DEVICE_RANGE_METERS * cell}
            fill={theme.colors.target}
            fillOpacity={0.1}
            stroke={theme.colors.target}
            strokeWidth={3}
          />

          {path.slice(1).map((to, i) => (
            <Line
              key={`p${i}`}
              x1={path[i]!.cx}
              y1={path[i]!.cy}
              x2={to.cx}
              y2={to.cy}
              stroke={theme.colors.accent}
              strokeOpacity={0.7}
              strokeWidth={2}
              strokeDasharray="6 5"
            />
          ))}

          <Circle
            cx={centerX}
            cy={centerY}
            r={markerRadius + 5}
            fill={theme.colors.accent}
            fillOpacity={0.15}
            stroke={theme.colors.accent}
            strokeOpacity={0.4}
          />
          <Circle cx={centerX} cy={centerY} r={markerRadius} fill={theme.colors.accent} />
          <SvgText
            x={centerX}
            y={centerY + 5}
            fontSize={15}
            fontWeight="600"
            fill={theme.colors.onAccent}
            textAnchor="middle"
          >
            0
          </SvgText>

          {path.slice(1).map(({ cx, cy }, index) => (
            <Circle
              key={`t${index}`}
              cx={cx}
              cy={cy}
              r={markerRadius}
              fill={theme.colors.target}
              stroke={theme.colors.surface}
              strokeWidth={2}
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
