// Persists the *running* chat conversation to Firestore so it survives a reload
// and syncs with the mobile app. Stored as a sibling of the app-state doc at
// `users/{uid}/appState/chat` = { messages: CloudChatMessage[], updatedAt }.
//
// Only the shared, portable fields are stored (fromUser + text, plus token
// metadata for display) — the same "visible messages" the Flutter app archives
// per session. The model context is rebuilt from these on load, exactly like the
// app's restoreSession. UI-only state (pending approvals, quick replies) is not
// persisted.
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../state/AuthContext';
import type { ChatTokenUsage } from '../../state/types';

export interface CloudChatMessage {
  fromUser: boolean;
  text: string;
  inputTokens: number | null;
  tokenUsage: ChatTokenUsage | null;
}

function normalize(m: Record<string, unknown>): CloudChatMessage {
  return {
    fromUser: Boolean(m.fromUser),
    text: String(m.text ?? ''),
    inputTokens: typeof m.inputTokens === 'number' ? m.inputTokens : null,
    tokenUsage: m.tokenUsage && typeof m.tokenUsage === 'object' ? (m.tokenUsage as ChatTokenUsage) : null,
  };
}

/** Cap the stored conversation so the doc stays small. Keeps the most recent
 * turns (a greeting-only prefix is cheap to drop). */
const MAX_STORED_MESSAGES = 120;

export interface CloudChat {
  loaded: boolean;
  /** Latest remote snapshot of the conversation. */
  remoteMessages: CloudChatMessage[];
  /** Bumps on every remote snapshot, so effects can react to *changes*. */
  remoteRev: number;
  /** Debounced write-through of the current conversation. */
  save: (messages: CloudChatMessage[]) => void;
  /** Reset the synced conversation (used by "new chat"). */
  clear: () => void;
}

export function useCloudChat(): CloudChat {
  const { uid } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [remoteMessages, setRemoteMessages] = useState<CloudChatMessage[]>([]);
  const [remoteRev, setRemoteRev] = useState(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setRemoteMessages([]);
    if (!uid) {
      // No account yet (anonymous sign-in still resolving, or offline). Treat as
      // "loaded, empty" so the chat can open with a local greeting; a later uid
      // brings the real snapshot in through the realtime listener.
      setLoaded(true);
      return;
    }
    setLoaded(false);
    const ref = doc(db, 'users', uid, 'appState', 'chat');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as { messages?: unknown } | undefined;
        const raw = Array.isArray(data?.messages) ? (data!.messages as Record<string, unknown>[]) : [];
        setRemoteMessages(raw.map(normalize));
        setRemoteRev((r) => r + 1);
        setLoaded(true);
      },
      () => setLoaded(true),
    );
    return unsub;
  }, [uid]);

  const save = useCallback(
    (messages: CloudChatMessage[]) => {
      if (!uid) return;
      const trimmed = messages.length > MAX_STORED_MESSAGES ? messages.slice(messages.length - MAX_STORED_MESSAGES) : messages;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const ref = doc(db, 'users', uid, 'appState', 'chat');
        setDoc(ref, { messages: trimmed, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {
          /* offline — retried on next turn */
        });
      }, 600);
    },
    [uid],
  );

  const clear = useCallback(() => {
    if (!uid) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const ref = doc(db, 'users', uid, 'appState', 'chat');
    setDoc(ref, { messages: [], updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }, [uid]);

  return { loaded, remoteMessages, remoteRev, save, clear };
}
