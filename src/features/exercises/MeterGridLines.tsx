import { G, Line, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/design-system';

export const METER_GRID_LABEL_GUTTER = 32;

type MeterGridLinesProps = {
  columns: number;
  rows: number;
  cell: number;
  left: number;
  top: number;
};

export function MeterGridLines({ columns, rows, cell, left, top }: MeterGridLinesProps) {
  const theme = useTheme();
  const width = cell * columns;
  const height = cell * rows;
  const lineProps = { stroke: theme.colors.accent, strokeOpacity: 0.45, strokeWidth: 1 };
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
          {...lineProps}
        />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <Line
          key={`h${i}`}
          x1={left}
          y1={top + i * cell}
          x2={left + width}
          y2={top + i * cell}
          {...lineProps}
        />
      ))}
      {Array.from({ length: columns }, (_, i) => (
        <SvgText
          key={`cl${i}`}
          x={left + (i + 0.5) * cell}
          y={top - 10}
          textAnchor="middle"
          {...labelProps}
        >
          1m
        </SvgText>
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <SvgText
          key={`rl${i}`}
          x={left - 8}
          y={top + (i + 0.5) * cell + 4}
          textAnchor="end"
          {...labelProps}
        >
          1m
        </SvgText>
      ))}
    </G>
  );
}
