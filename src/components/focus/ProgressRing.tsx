import { useId, type ReactNode } from 'react';

interface ProgressRingProps {
  size: number;
  stroke: number;
  /** 0..1 */
  progress: number;
  track: string;
  colorStart: string;
  colorEnd?: string;
  glow?: string;
  children?: ReactNode;
}

/** Circular countdown/progress ring. SVG stroke-dasharray trick, background
 * track from --sf-ring-track, progress arc from --sf-accent(/--sf-accent2). */
export function ProgressRing({
  size,
  stroke,
  progress,
  track,
  colorStart,
  colorEnd,
  glow,
  children,
}: ProgressRingProps) {
  const gradId = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = c * (1 - clamped);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', filter: glow, overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd ?? colorStart} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.35s linear' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
