import type { ChatTokenUsage } from '../../state/types';

/** A data-mutating action (or list of actions, for a multi-action reply)
 * proposed by the AI, awaiting the user's approve/cancel tap. Mirrors the
 * concept of `pendingAiApprovalKey` + `_pendingAiActions` in app_controller.dart
 * (a simplified version — no cross-session undo snapshots). */
export interface PendingMutation {
  actions: Record<string, unknown>[];
  resolved: 'pending' | 'approved' | 'rejected';
}

/** One bubble in the chat. Local to the web chat UI — not the same shape as
 * state/types.ts's ChatMessage (which is the mobile-app Firestore shape); this
 * one additionally tracks the approve/cancel + focus-CTA UI state. */
export interface LocalChatMessage {
  id: string;
  fromUser: boolean;
  text: string;
  inputTokens?: number | null;
  tokenUsage?: ChatTokenUsage | null;
  pending?: PendingMutation | null;
  /** Minutes for a just-started focus session, so the bubble can offer a
   * "Go to Focus" link. */
  focusMinutes?: number | null;
  /** Quick-reply chips shown under this bubble (pre-fill the composer only). */
  quickReplies?: string[];
}
