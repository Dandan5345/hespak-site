interface BarChartProps {
  values: number[];
  labels: string[];
  color: string;
  highlightColor?: string;
  height?: number;
  valueSuffix?: string;
}

/** Hand-rolled bar chart (no charting library) — bottom-aligned bars sized
 * relative to the max value in the series, with the last bar (today)
 * highlighted, matching the Dart stats screen's `_Bar` treatment. */
export function BarChart({ values, labels, color, highlightColor, height = 120, valueSuffix }: BarChartProps) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {values.map((v, i) => {
        const pct = Math.max(v > 0 ? 4 : 0, (v / max) * 100);
        const isLast = i === values.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="w-full flex-1 flex items-end justify-center" title={`${v}${valueSuffix ?? ''}`}>
              <div
                className="w-full rounded-t-[6px] rounded-b-[3px] transition-[height] duration-500 ease-out"
                style={{
                  height: `${pct}%`,
                  minHeight: v > 0 ? 3 : 0,
                  background: isLast && highlightColor ? highlightColor : color,
                }}
              />
            </div>
            <span
              className="text-[10px] font-bold truncate w-full text-center"
              style={{ color: 'var(--sf-text-dim)' }}
            >
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
