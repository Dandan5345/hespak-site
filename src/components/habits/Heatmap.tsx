import { addDays, dateKey } from './habitsStore';

interface HeatmapProps {
  weeks?: number;
  cellSize?: number;
  accent: string;
  track: string;
  /** Provide either a boolean done-log (binary heatmap, e.g. a single habit)... */
  log?: Record<string, boolean>;
  /** ...or a 0-4 intensity function per date key (graduated heatmap, e.g. study consistency). */
  levelFor?: (key: string) => number;
}

/** GitHub-style consistency heatmap: `weeks` columns x 7 day-rows, oldest
 * week first (leading edge), today last (trailing edge) — reimplements the
 * visual idea of lib/widgets/heatmap.dart as CSS/SVG. */
export function Heatmap({ weeks = 12, cellSize = 11, accent, track, log, levelFor }: HeatmapProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = weeks * 7;

  const columns: string[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col: string[] = [];
    for (let d = 6; d >= 0; d--) {
      const offset = w * 7 + d;
      if (offset >= totalDays) continue;
      const day = addDays(today, -offset);
      col.push(dateKey(day));
    }
    columns.unshift(col.reverse());
  }

  const levelOf = (key: string): number => {
    if (levelFor) return Math.max(0, Math.min(4, levelFor(key)));
    return log?.[key] ? 4 : 0;
  };

  const colorOf = (level: number): string => {
    if (level <= 0) return track;
    const pct = level * 20 + 15; // matches heatmap.dart's (lv*20+15)/100 alpha
    return `color-mix(in srgb, ${accent} ${pct}%, transparent)`;
  };

  return (
    <div className="flex justify-between gap-[3px] overflow-x-auto">
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map((key) => (
            <div
              key={key}
              title={key}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: Math.max(2, cellSize * 0.27),
                background: colorOf(levelOf(key)),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
