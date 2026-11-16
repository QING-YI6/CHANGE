import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './lib/store';
import { Toast } from './components/ui';
import Today from './pages/Today';
import Write from './pages/Write';
import Review from './pages/Review';
import Lab from './pages/Lab';
import Me from './pages/Me';
import { Icon } from './components/ui';
import { cx } from './components/ui';
import {
  SCRATCH_FLUSH_EVENT,
  SCRATCH_IDLE_MS,
  appendBody,
  listDrafts,
  removeDraft
} from './lib/scratch';

const TABS = [
  { key: 'today', label: '今日', icon: 'today' },
  { key: 'write', label: '手记', icon: 'write' },
  { key: 'review', label: '回望', icon: 'review' },
  { key: 'lab', label: '实验', icon: 'lab' },
  { key: 'me', label: '我', icon: 'me' }
] as const;

type TabKey = (typeof TABS)[number]['key'];

function readTab(): TabKey {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  const found = TABS.find((t) => t.key === h);
  return found ? found.key : 'today';
}

function useHashTab() {
  const [tab, setTab] = useState<TabKey>(readTab);
  useEffect(() => {
    const on = () => setTab(readTab());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (key: TabKey) => {
    if (window.location.hash === `#/${key}`) return;
    window.location.hash = `/${key}`;
    window.scrollTo({ top: 0 });
  };
  return [tab, go] as const;
}

function Page({ tab }: { tab: TabKey }) {
  switch (tab) {
    case 'write':
      return <Write />;
    case 'review':
      return <Review />;
    case 'lab':
      return <Lab />;
    case 'me':
      return <Me />;
    default:
      return <Today />;
  }
}

function useScratchFlusher() {
  const { patchEntry } = useApp();

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      for (const { date, draft } of listDrafts()) {
        if (!draft.text.trim()) {
          removeDraft(date);
          continue;
        }
        if (now - draft.updatedAt < SCRATCH_IDLE_MS) continue;
        patchEntry(date, (e) => ({ body: appendBody(e.body, draft.text, draft.updatedAt) }));
        removeDraft(date);
        window.dispatchEvent(
          new CustomEvent(SCRATCH_FLUSH_EVENT, { detail: { date, text: draft.text } })
        );
      }
    };

    const id = window.setInterval(tick, 15000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    tick();
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [patchEntry]);
}

function Shell() {
  const { toastMsg } = useApp();
  const [tab, go] = useHashTab();
  useScratchFlusher();

  return (
    <div className="relative min-h-[100dvh]">
      <div className="backdrop" />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[520px] flex-col">
        <main key={tab} className="anim-in flex-1 pb-32">
          <Page tab={tab} />
        </main>
      </div>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="pointer-events-auto mx-auto max-w-[520px] px-3 pb-safe">
          <div className="no-callout flex items-stretch justify-between rounded-[26px] border border-line/70 bg-surface/85 px-1.5 py-1.5 shadow-lift backdrop-blur-xl">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => go(t.key)}
                  className={cx(
                    'relative flex flex-1 flex-col items-center gap-1 rounded-[20px] py-2 transition-all duration-300 ease-soft active:scale-95',
                    active ? 'text-ink' : 'text-faint'
                  )}
                >
                  <Icon name={t.icon} className={cx('h-[21px] w-[21px] transition-transform duration-300', active && 'scale-[1.06]')} />
                  <span className="text-[10px] tracking-[0.12em]">{t.label}</span>
                  <span
                    className={cx(
                      'absolute -bottom-0 h-[3px] w-[3px] rounded-full bg-clay transition-opacity duration-300',
                      active ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <Toast msg={toastMsg} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
