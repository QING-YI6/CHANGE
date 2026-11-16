import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SCRATCH_FLUSH_EVENT,
  SCRATCH_IDLE_MS,
  readDraft,
  removeDraft,
  writeDraft
} from '../lib/scratch';

export function ScratchBox({
  date,
  onFlush,
  onTextChange,
  idleMs = SCRATCH_IDLE_MS
}: {
  date: string;
  onFlush: (text: string, at: number, date: string) => void;
  onTextChange?: (text: string) => void;
  idleMs?: number;
}) {
  const [text, setText] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const textRef = useRef('');
  const flushRef = useRef(onFlush);
  const notifyRef = useRef(onTextChange);
  const mounted = useRef(true);

  flushRef.current = onFlush;
  notifyRef.current = onTextChange;

  const apply = useCallback((v: string) => {
    textRef.current = v;
    if (mounted.current) setText(v);
    notifyRef.current?.(v);
  }, []);

  const doFlush = useCallback(
    (raw: string, forDate: string = date) => {
      const clean = raw.trim();
      if (!clean) return;
      flushRef.current(clean, Date.now(), forDate);
      removeDraft(forDate);
      apply('');
      if (mounted.current) {
        setFlash('已收进手记');
        window.setTimeout(() => {
          if (mounted.current) setFlash(null);
        }, 2400);
      }
    },
    [date, apply]
  );

  // 载入草稿：离开太久（超过 8 分钟）才归档；否则原样接着写
  useEffect(() => {
    const d = readDraft(date);
    if (d?.text) {
      if (Date.now() - d.updatedAt > idleMs) {
        // 直接写进手记，用最后输入的时间做时间戳
        flushRef.current(d.text, d.updatedAt, date);
        removeDraft(date);
        apply('');
      } else {
        apply(d.text);
      }
    } else {
      apply('');
    }
    // 只在日期变化时重新载入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, idleMs]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 全局 watcher 归档后，清空输入框（但如果本地已经有更新的输入，就保留）
  useEffect(() => {
    const onFlushed = (e: Event) => {
      const detail = (e as CustomEvent<{ date: string; text: string }>).detail;
      if (!detail || detail.date !== date) return;
      if (textRef.current.trim() !== detail.text.trim()) return;
      apply('');
    };
    window.addEventListener(SCRATCH_FLUSH_EVENT, onFlushed);
    return () => window.removeEventListener(SCRATCH_FLUSH_EVENT, onFlushed);
  }, [date, apply]);

  const onChange = (v: string) => {
    apply(v);
    writeDraft(date, v);
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={'现在脑子里最响的那句话是什么？\n不用完整，不用通顺。'}
        className="w-full resize-none bg-transparent px-5 py-2 font-serif text-[16px] leading-[1.9] text-ink outline-none placeholder:text-faint/70"
      />
      <div className="flex items-center justify-between px-5 pb-3">
        <span className="text-[10px] text-faint">
          {flash ? flash : text.trim() ? '停笔 8 分钟后收进手记 · 切页不会丢' : '写成什么样都行'}
        </span>
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => doFlush(textRef.current)}
          className="text-[10.5px] text-moss disabled:opacity-30"
        >
          现在收进手记
        </button>
      </div>
    </div>
  );
}
