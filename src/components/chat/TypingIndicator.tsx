import type { SfTokens } from '../../theme/tokens';
import { AgentAvatar } from './AgentAvatar';

/** Three-dot "AI is typing" bubble, start-aligned like an assistant message. */
export function TypingIndicator({ tokens }: { tokens: SfTokens }) {
  return (
    <div className="flex justify-start mb-3 items-end gap-2">
      <AgentAvatar size={30} tokens={tokens} />
      <div
        className="px-4 py-3 rounded-[20px] flex items-center gap-1.5"
        style={{
          background: tokens.surface,
          border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`,
          boxShadow: tokens.cardShadow,
          borderEndStartRadius: 6,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block w-[7px] h-[7px] rounded-full animate-bounce"
            style={{
              background: tokens.textFaint,
              animationDelay: `${i * 0.15}s`,
              animationDuration: '0.9s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
