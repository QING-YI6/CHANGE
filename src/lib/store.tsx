import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type { Analysis, AppState, Entry, Experiment, ISODate, Settings } from '../types';
import { DEFAULT_SETTINGS, emptyEntry } from '../types';
import { clearState, loadState, saveState } from './db';
import { activeDate } from './date';
import { demoState } from './demo';

type Patch = Partial<Entry> | ((entry: Entry) => Partial<Entry>);

interface StoreApi {
  ready: boolean;
  demo: boolean;
  state: AppState;
  today: ISODate;
  entryOf: (date?: ISODate) => Entry | undefined;
  patchEntry: (date: ISODate, patch: Patch) => void;
  addNote: (date: ISODate, text: string, kind?: 'self' | 'ai') => void;
  addAnalysis: (a: Analysis) => void;
  analysisOf: (date: ISODate) => Analysis | undefined;
  addExperiment: (e: Experiment) => void;
  patchExperiment: (id: string, patch: Partial<Experiment>) => void;
  markExperiment: (id: string, date: ISODate, status: 'done' | 'skip' | null) => void;
  deleteExperiment: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  replaceState: (s: AppState) => void;
  resetAll: () => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const AppCtx = createContext<StoreApi | null>(null);

function normalize(raw: AppState | null): AppState {
  if (!raw || typeof raw !== 'object') {
    return { v: 1, settings: { ...DEFAULT_SETTINGS }, entries: [], experiments: [], analyses: [] };
  }
  const entries = Array.isArray(raw.entries) ? raw.entries : [];
  return {
    v: 1,
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
    entries: entries
      .filter((e) => e && typeof e.date === 'string')
      .map((e) => ({
        ...e,
        body: typeof e.body === 'string' ? e.body : '',
        energy: e.energy || {},
        mood: Array.isArray(e.mood) ? e.mood : [],
        tags: Array.isArray(e.tags) ? e.tags : [],
        notes: Array.isArray(e.notes) ? e.notes : []
      })),
    experiments: (Array.isArray(raw.experiments) ? raw.experiments : []).map((x) => ({
      ...x,
      logs: x.logs || {}
    })),
    analyses: Array.isArray(raw.analyses) ? raw.analyses : []
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const demo = useMemo(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1',
    []
  );
  const [state, setState] = useState<AppState | null>(null);
  const [today, setToday] = useState<ISODate>(activeDate());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (demo) {
        if (alive) setState(demoState());
        return;
      }
      const loaded = await loadState<AppState>();
      if (alive) setState(normalize(loaded));
    })();
    return () => {
      alive = false;
    };
  }, [demo]);

  useEffect(() => {
    if (!state || demo) return;
    const t = window.setTimeout(() => {
      void saveState(state);
    }, 450);
    return () => window.clearTimeout(t);
  }, [state, demo]);

  useEffect(() => {
    const sync = () => {
      const t = activeDate();
      setToday((prev) => (prev === t ? prev : t));
    };
    const id = window.setInterval(sync, 30000);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  const theme = state?.settings.theme ?? 'auto';
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const forced = new URLSearchParams(window.location.search).get('theme');
    const apply = () => {
      const dark = forced ? forced === 'dark' : theme === 'dark' || (theme === 'auto' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#131211' : '#F6F2E9');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const patchEntry = useCallback((date: ISODate, patch: Patch) => {
    setState((prev) => {
      if (!prev) return prev;
      const now = Date.now();
      const idx = prev.entries.findIndex((e) => e.date === date);
      let entries: Entry[];
      if (idx === -1) {
        const base = emptyEntry(date);
        const p = typeof patch === 'function' ? patch(base) : patch;
        entries = [{ ...base, ...p, updatedAt: now }, ...prev.entries];
      } else {
        const cur = prev.entries[idx];
        const p = typeof patch === 'function' ? patch(cur) : patch;
        entries = prev.entries.slice();
        entries[idx] = { ...cur, ...p, updatedAt: now };
      }
      entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      return { ...prev, entries };
    });
  }, []);

  const addNote = useCallback((date: ISODate, text: string, kind: 'self' | 'ai' = 'self') => {
    const clean = text.trim();
    if (!clean) return;
    patchEntry(date, (e) => ({
      notes: [
        ...e.notes,
        { id: `${date}-${Date.now().toString(36)}`, at: Date.now(), text: clean, kind }
      ]
    }));
  }, [patchEntry]);

  const addAnalysis = useCallback((a: Analysis) => {
    setState((prev) => (prev ? { ...prev, analyses: [...prev.analyses, a] } : prev));
  }, []);

  const addExperiment = useCallback((e: Experiment) => {
    setState((prev) => (prev ? { ...prev, experiments: [e, ...prev.experiments] } : prev));
  }, []);

  const patchExperiment = useCallback((id: string, patch: Partial<Experiment>) => {
    setState((prev) =>
      prev
        ? {
            ...prev,
            experiments: prev.experiments.map((x) => (x.id === id ? { ...x, ...patch } : x))
          }
        : prev
    );
  }, []);

  const markExperiment = useCallback((id: string, date: ISODate, status: 'done' | 'skip' | null) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        experiments: prev.experiments.map((x) => {
          if (x.id !== id) return x;
          const patch =
            status === 'done'
              ? { done: true, skipped: false }
              : status === 'skip'
                ? { done: false, skipped: true }
                : { done: false, skipped: false };
          return { ...x, logs: { ...x.logs, [date]: { ...x.logs[date], ...patch } } };
        })
      };
    });
  }, []);

  const deleteExperiment = useCallback((id: string) => {
    setState((prev) =>
      prev ? { ...prev, experiments: prev.experiments.filter((x) => x.id !== id) } : prev
    );
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => (prev ? { ...prev, settings: { ...prev.settings, ...patch } } : prev));
  }, []);

  const replaceState = useCallback((s: AppState) => {
    setState(normalize(s));
  }, []);

  const resetAll = useCallback(() => {
    void clearState();
    setState({ v: 1, settings: { ...DEFAULT_SETTINGS }, entries: [], experiments: [], analyses: [] });
  }, []);

  const entryOf = useCallback(
    (date?: ISODate) => (state ? state.entries.find((e) => e.date === (date || today)) : undefined),
    [state, today]
  );

  const analysisOf = useCallback(
    (date: ISODate) => {
      if (!state) return undefined;
      const list = state.analyses.filter((a) => a.date === date);
      return list.length ? list[list.length - 1] : undefined;
    },
    [state]
  );

  const value: StoreApi | null = state
    ? {
        ready: true,
        demo,
        state,
        today,
        entryOf,
        patchEntry,
        addNote,
        addAnalysis,
        analysisOf,
        addExperiment,
        patchExperiment,
        markExperiment,
        deleteExperiment,
        setSettings,
        replaceState,
        resetAll,
        toast,
        toastMsg
      }
    : null;

  if (!value) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full border border-line" />
          <p className="mt-4 text-[13px] tracking-[0.2em] text-faint">CHANGE</p>
        </div>
      </div>
    );
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): StoreApi {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function downloadJSON(state: AppState) {
  const payload = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `change-${activeDate()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
