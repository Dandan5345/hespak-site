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
  CalendarCommand,
  Course,
  CreatedBy,
  EventType,
  ScheduleItem,
  SmartReminder,
  Task,
  Urgency,
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
  deviceCalendarItems: [],
  calendarCommands: [],
  smartReminders: [],
  agentMemory: '',
  agentName: '',
};

/** Normalize Urgency values from Flutter's camelCase (or old snake_case) to
 * the canonical camelCase format used by both apps. */
function normUrgency(u: unknown): Urgency {
  const s = typeof u === 'string' ? u : '';
  if (s === 'notUrgent' || s === 'not_urgent') return 'notUrgent';
  if (s === 'veryUrgent' || s === 'very_urgent') return 'veryUrgent';
  if (s === 'urgent') return 'urgent';
  return 'notUrgent';
}

/** Normalize EventType values from Flutter's 'classLesson' to web's canonical form. */
function normEventType(t: unknown): EventType {
  const s = typeof t === 'string' ? t : '';
  if (s === 'classLesson' || s === 'class') return 'classLesson';
  if (s === 'exam') return 'exam';
  if (s === 'submission') return 'submission';
  return 'personal';
}

function normalizeTask(t: Record<string, unknown>): Task {
  return {
    id: String(t.id ?? ''),
    title: String(t.title ?? ''),
    description: typeof t.description === 'string' ? t.description : null,
    courseId: typeof t.courseId === 'string' ? t.courseId : null,
    dueDateTime: typeof t.dueDateTime === 'string' ? t.dueDateTime : null,
    urgency: normUrgency(t.urgency),
    estimatedDurationMinutes: typeof t.estimatedDurationMinutes === 'number' ? t.estimatedDurationMinutes : null,
    isCompleted: Boolean(t.isCompleted),
    completedAt: typeof t.completedAt === 'string' ? t.completedAt : null,
    createdBy: (t.createdBy as CreatedBy) ?? 'user',
    createdAt: String(t.createdAt ?? new Date().toISOString()),
    updatedAt: String(t.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeScheduleItem(s: Record<string, unknown>): ScheduleItem {
  return {
    id: String(s.id ?? ''),
    taskId: typeof s.taskId === 'string' ? s.taskId : null,
    title: String(s.title ?? ''),
    description: typeof s.description === 'string' ? s.description : null,
    startDateTime: String(s.startDateTime ?? new Date().toISOString()),
    endDateTime: String(s.endDateTime ?? new Date().toISOString()),
    type: normEventType(s.type),
    weeklyRepeat: Boolean(s.weeklyRepeat),
    allDay: Boolean(s.allDay),
    isCompleted: Boolean(s.isCompleted),
    externalEventId: typeof s.externalEventId === 'string' ? s.externalEventId : null,
    calendarId: typeof s.calendarId === 'string' ? s.calendarId : null,
    calendarColor: typeof s.calendarColor === 'number' ? s.calendarColor : null,
    createdBy: (s.createdBy as CreatedBy) ?? 'user',
    createdAt: String(s.createdAt ?? new Date().toISOString()),
    updatedAt: String(s.updatedAt ?? new Date().toISOString()),
  };
}

function normalizeCalendarCommand(c: Record<string, unknown>): CalendarCommand | null {
  const action = c.action === 'upsert' || c.action === 'delete' ? c.action : null;
  if (!action) return null;
  const item = c.item && typeof c.item === 'object' ? normalizeScheduleItem(c.item as Record<string, unknown>) : null;
  return {
    id: String(c.id ?? genId()),
    action,
    item,
    calendarId: typeof c.calendarId === 'string' ? c.calendarId : (item?.calendarId ?? null),
    externalEventId: typeof c.externalEventId === 'string' ? c.externalEventId : (item?.externalEventId ?? null),
    source: 'web',
    createdAt: String(c.createdAt ?? new Date().toISOString()),
  };
}

function externalEventIdFromMirrorId(id: string): string | null {
  if (!id.startsWith('dev:')) return null;
  const rest = id.slice(4);
  const sep = rest.indexOf(':');
  return sep < 0 ? rest : rest.slice(sep + 1);
}

function calendarCommand(action: CalendarCommand['action'], item: ScheduleItem): CalendarCommand {
  return {
    id: genId(),
    action,
    item,
    calendarId: item.calendarId ?? null,
    externalEventId: item.externalEventId ?? externalEventIdFromMirrorId(item.id),
    source: 'web',
    createdAt: new Date().toISOString(),
  };
}

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
        const data = snap.data() as Record<string, unknown> | undefined;
        suppressNextPush.current = true;
        const rawTasks = (data?.tasks as Record<string, unknown>[]) ?? [];
        const rawSchedule = (data?.scheduleItems as Record<string, unknown>[]) ?? [];
        const rawDeviceSchedule = (data?.deviceCalendarItems as Record<string, unknown>[]) ?? [];
        const rawCommands = (data?.calendarCommands as Record<string, unknown>[]) ?? [];
        setState({
          courses: (data?.courses as Course[]) ?? [],
          tasks: rawTasks.map(normalizeTask),
          scheduleItems: rawSchedule.map(normalizeScheduleItem),
          deviceCalendarItems: rawDeviceSchedule.map(normalizeScheduleItem),
          calendarCommands: rawCommands.map(normalizeCalendarCommand).filter((c): c is CalendarCommand => c != null),
          smartReminders: (data?.smartReminders as SmartReminder[]) ?? [],
          agentMemory: String(data?.agentMemory ?? ''),
          agentName: String(data?.agentName ?? ''),
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
  const allScheduleItems = useMemo(
    () => [...state.scheduleItems, ...state.deviceCalendarItems],
    [state.scheduleItems, state.deviceCalendarItems],
  );
  const scheduleById = useCallback((id?: string | null) => allScheduleItems.find((s) => s.id === id), [allScheduleItems]);

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
      deviceCalendarItems: prev.deviceCalendarItems.map((s) => {
        if (s.id !== id) return s;
        const item = { ...s, ...patch, updatedAt: nowIso() };
        return item;
      }),
      calendarCommands: prev.deviceCalendarItems.some((s) => s.id === id)
        ? [
            ...prev.calendarCommands,
            calendarCommand('upsert', { ...prev.deviceCalendarItems.find((s) => s.id === id)!, ...patch, updatedAt: nowIso() }),
          ]
        : prev.calendarCommands,
    }));
  };
  const deleteScheduleItem: DataCtx['deleteScheduleItem'] = (id) => {
    mutate((prev) => {
      const deviceItem = prev.deviceCalendarItems.find((s) => s.id === id);
      return {
        ...prev,
        scheduleItems: prev.scheduleItems.filter((s) => s.id !== id),
        deviceCalendarItems: prev.deviceCalendarItems.filter((s) => s.id !== id),
        calendarCommands: deviceItem ? [...prev.calendarCommands, calendarCommand('delete', deviceItem)] : prev.calendarCommands,
      };
    });
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
      scheduleItems: allScheduleItems,
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
    [loaded, state, tokenQuota, courseById, taskById, scheduleById, allScheduleItems, deleteAllCloudData],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
