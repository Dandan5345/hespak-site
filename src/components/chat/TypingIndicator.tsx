import type { SfTokens } from '../../theme/tokens';
import { AgentAvatar } from './AgentAvatar';

/** Three-dot "AI is typing" bubble matching the Flutter app's _TypingBubble.
 * Dots bounce with a staggered 150ms phase; an optional status line under them
 * mirrors the app's chatTypingStatus ("loading schedule instructions…"). */
export function TypingIndicator({ tokens, status }: { tokens: SfTokens; status?: string | null }) {
  return (
    <div className="flex justify-start mb-3 items-end gap-2 sf-bubble-in">
      <AgentAvatar size={30} tokens={tokens} />
      <div
        className="px-4 py-3"
        style={{
          background: tokens.surface,
          border: `${tokens.cardBorderWidth}px solid ${tokens.cardBorderColor}`,
          boxShadow: tokens.cardShadow,
          borderRadius: 20,
          borderEndStartRadius: 6,
        }}
      >
        <div className="flex items-center gap-[5px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block w-[7px] h-[7px] rounded-full"
              style={{
                background: tokens.textFaint,
                animation: `typing-dot 1.2s ${i * 0.15}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
        {status && (
          <div className="mt-1.5 text-[11px] font-semibold" style={{ color: tokens.textDim }}>
            {status}
          </div>
        )}
      </div>
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
