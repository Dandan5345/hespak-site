import type { ReactNode } from 'react';
import type { SfTokens } from '../../theme/tokens';

/** Modal bottom sheet matching the app's showModalBottomSheet styling: dim
 * scrim, 28px top radius, grabber handle. Centers as a card on wide screens. */
export function BottomSheet({ tokens, onClose, children, maxWidth = 'sm:max-w-sm' }: { tokens: SfTokens; onClose: () => void; children: ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="absolute inset-0 sf-fade-in" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }} />
      <div
        className={`relative w-full ${maxWidth} rounded-t-[28px] sm:rounded-[24px] p-5 pb-8 max-h-[80vh] overflow-y-auto sf-sheet-in`}
        style={{ background: tokens.bg2, color: tokens.text, boxShadow: '0 -12px 40px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-[5px] w-[42px] rounded-full" style={{ background: tokens.textFaint }} />
        {children}
      </div>
    </div>
  );
}
