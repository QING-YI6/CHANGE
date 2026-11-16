import { useEffect, useRef, useState } from 'react';
import { Sheet, cx } from './ui';

const ITEM_H = 44;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const pad = (n: number) => String(n).padStart(2, '0');

function split(value?: string): [number, number] {
  if (!value) return [8, 0];
  const [h, m] = value.split(':').map(Number);
  return [Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 8, Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0];
}

function Wheel({
  values,
  value,
  onChange,
  width
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  width: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const i = Math.max(0, values.indexOf(value));
    el.scrollTop = i * ITEM_H;
    // 只在打开时定位一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM_H)));
      onChange(values[i]);
    }, 90);
  };

  return (
    <div className="relative overflow-hidden" style={{ height: ITEM_H * 5, width }}>
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
      >
        <div style={{ height: ITEM_H * 2 }} />
        {values.map((v) => (
          <div
            key={v}
            style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
            className={cx(
              'num flex items-center justify-center transition-all duration-200',
              v === value ? 'text-[22px] text-ink' : 'text-[15px] text-faint/60'
            )}
          >
            {pad(v)}
          </div>
        ))}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  );
}

export function TimePickerSheet({
  open,
  title = '选时间',
  value,
  onClose,
  onConfirm,
  allowClear = true
}: {
  open: boolean;
  title?: string;
  value?: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
  allowClear?: boolean;
}) {
  if (!open) return null;
  return (
    <Sheet open onClose={onClose} title={title}>
      <WheelBody initial={value} allowClear={allowClear} onConfirm={onConfirm} />
    </Sheet>
  );
}

function WheelBody({
  initial,
  allowClear,
  onConfirm
}: {
  initial?: string;
  allowClear?: boolean;
  onConfirm: (value: string) => void;
}) {
  const [h, setH] = useState(() => split(initial)[0]);
  const [m, setM] = useState(() => split(initial)[1]);

  return (
    <>
      <div className="relative mx-auto w-[208px] select-none">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-11 -translate-y-1/2 rounded-2xl bg-ink/[0.05]" />
        <div className="relative flex items-center justify-center gap-1">
          <Wheel values={HOURS} value={h} onChange={setH} width={76} />
          <span className="pb-1 text-[20px] text-ink/35">:</span>
          <Wheel values={MINUTES} value={m} onChange={setM} width={76} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-paper to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-paper to-transparent" />
      </div>
      <div className="mt-5 flex gap-2">
        {allowClear ? (
          <button type="button" onClick={() => onConfirm('')} className="btn-soft flex-1 py-2.5 text-[13px]">
            清除
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onConfirm(`${pad(h)}:${pad(m)}`)}
          className="btn-primary flex-1 py-2.5 text-[13px]"
        >
          好
        </button>
      </div>
    </>
  );
}

export function TimeField({
  value,
  onChange,
  placeholder = '选时间',
  className,
  title
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx('field num text-left', !value && 'text-faint', className)}
      >
        {value || placeholder}
      </button>
      <TimePickerSheet
        open={open}
        title={title || placeholder}
        value={value}
        onClose={() => setOpen(false)}
        onConfirm={(v) => {
          onChange(v);
          setOpen(false);
        }}
      />
    </>
  );
}
