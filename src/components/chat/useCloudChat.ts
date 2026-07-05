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

export type CloudUndoSnapshots = Record<string, string>;

export interface CloudChatMessage {
  fromUser: boolean;
  text: string;
  actionKeys: string[];
  inputTokens: number | null;
  tokenUsage: ChatTokenUsage | null;
}

/** A saved past conversation the user can restore. Same shape as the app's
 * ChatSession, stored alongside the active thread in the chat doc; the web
 * additionally stores which instruction packs the conversation had loaded so
 * restoring it brings the exact same capabilities back (no keyword guessing). */
export interface CloudChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: CloudChatMessage[];
  totalTokens: number;
  packs?: string[];
  packsEntities?: boolean;
}

/** Up to this many past conversations are kept (newest first), matching the
 * mobile app's _maxSessions. */
export const MAX_SESSIONS = 5;

function normalize(m: Record<string, unknown>): CloudChatMessage {
  return {
    fromUser: Boolean(m.fromUser),
    text: String(m.text ?? ''),
    actionKeys: Array.isArray(m.actionKeys) ? m.actionKeys.filter((k): k is string => typeof k === 'string') : [],
    inputTokens: typeof m.inputTokens === 'number' ? m.inputTokens : null,
    tokenUsage: m.tokenUsage && typeof m.tokenUsage === 'object' ? (m.tokenUsage as ChatTokenUsage) : null,
  };
}

function normalizeUndoSnapshots(raw: unknown): CloudUndoSnapshots {
  if (!raw || typeof raw !== 'object') return {};
  const out: CloudUndoSnapshots = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key.startsWith('ai_undo_change_')) continue;
    if (typeof value === 'string') out[key] = value;
    else if (value && typeof value === 'object' && typeof (value as { snapshotJson?: unknown }).snapshotJson === 'string') {
      out[key] = (value as { snapshotJson: string }).snapshotJson;
    }
  }
  return out;
}

function normalizePacks(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string') : [];
}

function normalizeSession(s: Record<string, unknown>): CloudChatSession {
  const rawMsgs = Array.isArray(s.messages) ? (s.messages as Record<string, unknown>[]) : [];
  return {
    id: String(s.id ?? ''),
    title: String(s.title ?? ''),
    createdAt: String(s.createdAt ?? new Date().toISOString()),
    messages: rawMsgs.map(normalize),
    totalTokens: typeof s.totalTokens === 'number' ? s.totalTokens : 0,
    packs: normalizePacks(s.packs),
    packsEntities: Boolean(s.packsEntities),
  };
}

/** Cap the stored conversation so the doc stays small. Keeps the most recent
 * turns (a greeting-only prefix is cheap to drop). */
const MAX_STORED_MESSAGES = 120;

export interface CloudChat {
  loaded: boolean;
  /** Latest remote snapshot of the conversation. */
  remoteMessages: CloudChatMessage[];
  /** Instruction packs the active thread had loaded (web-only field). */
  remotePacks: string[];
  /** Whether the active thread already includes the app-data context. */
  remotePacksEntities: boolean;
  /** Saved past conversations (newest first), synced across devices. */
  remoteSessions: CloudChatSession[];
  /** Undo snapshots keyed by actionKeys carried on confirmation bubbles. */
  remoteUndoSnapshots: CloudUndoSnapshots;
  /** Bumps on every remote snapshot, so effects can react to *changes*. */
  remoteRev: number;
  /** Debounced write-through of the current conversation + its loaded packs. */
  save: (messages: CloudChatMessage[], packs: string[], packsEntities: boolean, undoSnapshots?: CloudUndoSnapshots) => void;
  /** Reset the synced conversation (used by "new chat"). */
  clear: () => void;
  /** Persist the saved-sessions list (capped to MAX_SESSIONS). */
  saveSessions: (sessions: CloudChatSession[]) => void;
}

export function useCloudChat(): CloudChat {
  const { uid } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [remoteMessages, setRemoteMessages] = useState<CloudChatMessage[]>([]);
  const [remotePacks, setRemotePacks] = useState<string[]>([]);
  const [remotePacksEntities, setRemotePacksEntities] = useState(false);
  const [remoteSessions, setRemoteSessions] = useState<CloudChatSession[]>([]);
  const [remoteUndoSnapshots, setRemoteUndoSnapshots] = useState<CloudUndoSnapshots>({});
  const [remoteRev, setRemoteRev] = useState(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setRemoteMessages([]);
    setRemotePacks([]);
    setRemotePacksEntities(false);
    setRemoteSessions([]);
    setRemoteUndoSnapshots({});
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
        const data = snap.data() as { messages?: unknown; sessions?: unknown; packs?: unknown; packsEntities?: unknown; undoSnapshots?: unknown } | undefined;
        const raw = Array.isArray(data?.messages) ? (data!.messages as Record<string, unknown>[]) : [];
        const rawSessions = Array.isArray(data?.sessions) ? (data!.sessions as Record<string, unknown>[]) : [];
        setRemoteMessages(raw.map(normalize));
        setRemotePacks(normalizePacks(data?.packs));
        setRemotePacksEntities(Boolean(data?.packsEntities));
        setRemoteSessions(rawSessions.map(normalizeSession));
        setRemoteUndoSnapshots(normalizeUndoSnapshots(data?.undoSnapshots));
        setRemoteRev((r) => r + 1);
        setLoaded(true);
      },
      () => setLoaded(true),
    );
    return unsub;
  }, [uid]);

  const save = useCallback(
    (messages: CloudChatMessage[], packs: string[], packsEntities: boolean, undoSnapshots?: CloudUndoSnapshots) => {
      if (!uid) return;
      const trimmed = messages.length > MAX_STORED_MESSAGES ? messages.slice(messages.length - MAX_STORED_MESSAGES) : messages;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const ref = doc(db, 'users', uid, 'appState', 'chat');
        setDoc(ref, {
          messages: trimmed,
          packs,
          packsEntities,
          ...(undoSnapshots ? { undoSnapshots } : {}),
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch(() => {
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
    setDoc(ref, { messages: [], packs: [], packsEntities: false, undoSnapshots: {}, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }, [uid]);

  const saveSessions = useCallback(
    (sessions: CloudChatSession[]) => {
      if (!uid) return;
      const ref = doc(db, 'users', uid, 'appState', 'chat');
      setDoc(ref, { sessions: sessions.slice(0, MAX_SESSIONS), updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
    },
    [uid],
  );

  return { loaded, remoteMessages, remotePacks, remotePacksEntities, remoteSessions, remoteUndoSnapshots, remoteRev, save, clear, saveSessions };
}
