import type { SfTokens } from '../../theme/tokens';

/** Round AI avatar next to assistant bubbles and in the header. The mobile
 * app bundles a mascot portrait asset; the web build has no such asset, so
 * this uses the same accent gradient the app uses elsewhere with a simple
 * emoji glyph — same spot, same size, no extra asset to ship. */
export function AgentAvatar({ size = 32, tokens }: { size?: number; tokens: SfTokens }) {
  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: 'var(--sf-accent-gradient)',
        color: tokens.onAccent,
        fontSize: size * 0.52,
        boxShadow: tokens.glow !== 'none' ? tokens.glow : undefined,
      }}
    >
      🤖
    </div>
  );
}
