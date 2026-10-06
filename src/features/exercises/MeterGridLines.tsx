import { G, Line, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/design-system';

export const METER_GRID_LABEL_GUTTER = 32;

type MeterGridLinesProps = {
  columns: number;
  rows: number;
  cell: number;
  left: number;
  top: number;
  originRow?: number;
  showLabels?: boolean;
};

export function MeterGridLines({
  columns,
  rows,
  cell,
  left,
  top,
  originRow,
  showLabels = true,
}: MeterGridLinesProps) {
  const theme = useTheme();
  const width = cell * columns;
  const height = cell * rows;
  const originColumn = columns / 2;
  const lineProps = { stroke: theme.colors.border, strokeWidth: 1 };
  const axisProps = { stroke: theme.colors.gridAxis, strokeWidth: 1.5 };
  const labelProps = { fontSize: 12, fill: theme.colors.textSecondary };

  return (
    <G>
      {Array.from({ length: columns + 1 }, (_, i) => (
        <Line
          key={`v${i}`}
          x1={left + i * cell}
          y1={top}
          x2={left + i * cell}
          y2={top + height}
          {...(i === originColumn ? axisProps : lineProps)}
        />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <Line
          key={`h${i}`}
          x1={left}
          y1={top + i * cell}
          x2={left + width}
          y2={top + i * cell}
          {...(i === originRow ? axisProps : lineProps)}
        />
      ))}
      {showLabels
        ? Array.from({ length: columns + 1 }, (_, i) => (
            <SvgText
              key={`cl${i}`}
              x={left + i * cell}
              y={top - 10}
              textAnchor="middle"
              {...labelProps}
            >
              {i - originColumn}
            </SvgText>
          ))
        : null}
      {showLabels
        ? Array.from({ length: rows }, (_, i) => (
            <SvgText
              key={`rl${i}`}
              x={left - 10}
              y={top + (i + 1) * cell + 4}
              textAnchor="end"
              {...labelProps}
            >
              {i + 1}
            </SvgText>
          ))
        : null}
    </G>
  );
}
