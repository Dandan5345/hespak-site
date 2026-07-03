import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { genId } from './types';
import type {
  CloudAppState,
  Course,
  ScheduleItem,
  SmartReminder,
  Task,
  TokenQuota,
} from './types';

interface DataCtx {
  loaded: boolean;
  courses: Course[];
  tasks: Task[];
  scheduleItems: ScheduleItem[];
  smartReminders: SmartReminder[];
  agentName: string;
  agentMemory: string;
  tokenQuota: TokenQuota | null;

  courseById: (id?: string | null) => Course | undefined;
  taskById: (id?: string | null) => Task | undefined;
  scheduleById: (id?: string | null) => ScheduleItem | undefined;

  addCourse: (c: Omit<Course, 'id' | 'createdBy'> & { id?: string; createdBy?: Course['createdBy'] }) => Course;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string) => void;

  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isCompleted'> & Partial<Pick<Task, 'id' | 'createdBy' | 'isCompleted'>>) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addScheduleItem: (s: Omit<ScheduleItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'weeklyRepeat' | 'allDay' | 'isCompleted' | 'type'> & Partial<Pick<ScheduleItem, 'id' | 'createdBy' | 'weeklyRepeat' | 'allDay' | 'isCompleted' | 'type'>>) => ScheduleItem;
  updateScheduleItem: (id: string, patch: Partial<ScheduleItem>) => void;
  deleteScheduleItem: (id: string) => void;

  addSmartReminder: (r: Omit<SmartReminder, 'id' | 'notifId' | 'createdAt' | 'createdBy'> & Partial<Pick<SmartReminder, 'id' | 'createdBy'>>) => SmartReminder;
  updateSmartReminder: (id: string, patch: Partial<SmartReminder>) => void;
  deleteSmartReminder: (id: string) => void;

  setAgentName: (name: string) => void;
  setAgentMemory: (memory: string) => void;

  deleteAllCloudData: () => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

const EMPTY_STATE: CloudAppState = {
  courses: [],
  tasks: [],
  scheduleItems: [],
  smartReminders: [],
  agentMemory: '',
  agentName: '',
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { uid } = useAuth();
  const [state, setState] = useState<CloudAppState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);
  const [tokenQuota, setTokenQuota] = useState<TokenQuota | null>(null);
  const debounceRef = useRef<number | null>(null);
  const suppressNextPush = useRef(false);

  // Subscribe to this user's app-state document — realtime, so edits on the
  // mobile app show up here live and vice versa.
  useEffect(() => {
    setLoaded(false);
    if (!uid) {
      setState(EMPTY_STATE);
      return;
    }
    const ref = doc(db, 'users', uid, 'appState', 'data');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as Partial<CloudAppState> | undefined;
        suppressNextPush.current = true;
        setState({
          courses: data?.courses ?? [],
          tasks: data?.tasks ?? [],
          scheduleItems: data?.scheduleItems ?? [],
          smartReminders: data?.smartReminders ?? [],
          agentMemory: data?.agentMemory ?? '',
          agentName: data?.agentName ?? '',
        });
        setLoaded(true);
      },
      () => setLoaded(true),
    );
    return unsub;
  }, [uid]);

  // Watch the read-only token-quota doc (sole writer is the Cloudflare worker).
  useEffect(() => {
    if (!uid) {
      setTokenQuota(null);
      return;
    }
    const ref = doc(db, 'users', uid, 'private', 'tokenQuota');
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data();
      setTokenQuota(d ? { remainingTokens: d.remainingTokens ?? 10000, displayName: d.displayName ?? null } : { remainingTokens: 10000 });
    });
    return unsub;
  }, [uid]);

  // Debounced write-through to Firestore, matching CloudStore.push in the app.
  const push = useCallback(
    (next: CloudAppState) => {
      if (!uid) return;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const ref = doc(db, 'users', uid, 'appState', 'data');
        setDoc(ref, { ...next, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {
          /* offline — will retry on next edit */
        });
      }, 700);
    },
    [uid],
  );

  const mutate = useCallback(
    (updater: (prev: CloudAppState) => CloudAppState) => {
      setState((prev) => {
        const next = updater(prev);
        push(next);
        return next;
      });
    },
    [push],
  );

  // Skip pushing right after a remote snapshot lands (nothing changed locally).
  useEffect(() => {
    if (suppressNextPush.current) {
      suppressNextPush.current = false;
    }
  }, [state]);

  const nowIso = () => new Date().toISOString();

  const courseById = useCallback((id?: string | null) => state.courses.find((c) => c.id === id), [state.courses]);
  const taskById = useCallback((id?: string | null) => state.tasks.find((t) => t.id === id), [state.tasks]);
  const scheduleById = useCallback((id?: string | null) => state.scheduleItems.find((s) => s.id === id), [state.scheduleItems]);

  const addCourse: DataCtx['addCourse'] = (c) => {
    const course: Course = { createdBy: 'user', ...c, id: c.id ?? genId() };
    mutate((prev) => ({ ...prev, courses: [...prev.courses, course] }));
    return course;
  };
  const updateCourse: DataCtx['updateCourse'] = (id, patch) => {
    mutate((prev) => ({ ...prev, courses: prev.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  };
  const deleteCourse: DataCtx['deleteCourse'] = (id) => {
    mutate((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.id !== id),
      tasks: prev.tasks.map((t) => (t.courseId === id ? { ...t, courseId: null } : t)),
    }));
  };

  const addTask: DataCtx['addTask'] = (t) => {
    const task: Task = {
      createdBy: 'user',
      isCompleted: false,
      ...t,
      id: t.id ?? genId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    mutate((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
    return task;
  };
  const updateTask: DataCtx['updateTask'] = (id, patch) => {
    mutate((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t)),
    }));
  };
  const deleteTask: DataCtx['deleteTask'] = (id) => {
    mutate((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
      scheduleItems: prev.scheduleItems.filter((s) => s.taskId !== id),
    }));
  };

  const addScheduleItem: DataCtx['addScheduleItem'] = (s) => {
    const item: ScheduleItem = {
      createdBy: 'user',
      weeklyRepeat: false,
      allDay: false,
      isCompleted: false,
      type: 'personal',
      ...s,
      id: s.id ?? genId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    mutate((prev) => ({ ...prev, scheduleItems: [...prev.scheduleItems, item] }));
    return item;
  };
  const updateScheduleItem: DataCtx['updateScheduleItem'] = (id, patch) => {
    mutate((prev) => ({
      ...prev,
      scheduleItems: prev.scheduleItems.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: nowIso() } : s)),
    }));
  };
  const deleteScheduleItem: DataCtx['deleteScheduleItem'] = (id) => {
    mutate((prev) => ({ ...prev, scheduleItems: prev.scheduleItems.filter((s) => s.id !== id) }));
  };

  const addSmartReminder: DataCtx['addSmartReminder'] = (r) => {
    const reminder: SmartReminder = {
      createdBy: 'user',
      ...r,
      id: r.id ?? genId(),
      notifId: Date.now() % 1_000_000,
      createdAt: nowIso(),
    };
    mutate((prev) => ({ ...prev, smartReminders: [...prev.smartReminders, reminder].sort((a, b) => a.dateTime.localeCompare(b.dateTime)) }));
    return reminder;
  };
  const updateSmartReminder: DataCtx['updateSmartReminder'] = (id, patch) => {
    mutate((prev) => ({
      ...prev,
      smartReminders: prev.smartReminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };
  const deleteSmartReminder: DataCtx['deleteSmartReminder'] = (id) => {
    mutate((prev) => ({ ...prev, smartReminders: prev.smartReminders.filter((r) => r.id !== id) }));
  };

  const setAgentName: DataCtx['setAgentName'] = (name) => {
    mutate((prev) => ({ ...prev, agentName: name.trim() }));
  };
  const setAgentMemory: DataCtx['setAgentMemory'] = (memory) => {
    mutate((prev) => ({ ...prev, agentMemory: memory.trim().slice(0, 1400) }));
  };

  const deleteAllCloudData = useCallback(async () => {
    if (!uid) return;
    const ref = doc(db, 'users', uid, 'appState', 'data');
    await setDoc(ref, EMPTY_STATE);
  }, [uid]);

  const value = useMemo<DataCtx>(
    () => ({
      loaded,
      courses: state.courses,
      tasks: state.tasks,
      scheduleItems: state.scheduleItems,
      smartReminders: state.smartReminders,
      agentName: state.agentName,
      agentMemory: state.agentMemory,
      tokenQuota,
      courseById,
      taskById,
      scheduleById,
      addCourse,
      updateCourse,
      deleteCourse,
      addTask,
      updateTask,
      deleteTask,
      addScheduleItem,
      updateScheduleItem,
      deleteScheduleItem,
      addSmartReminder,
      updateSmartReminder,
      deleteSmartReminder,
      setAgentName,
      setAgentMemory,
      deleteAllCloudData,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, state, tokenQuota, courseById, taskById, scheduleById, deleteAllCloudData],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
