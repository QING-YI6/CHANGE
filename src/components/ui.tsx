import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Card({
  children,
  className,
  onClick
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cx('card tap w-full text-left', className)}>
        {children}
      </button>
    );
  }
  return <div className={cx('card', className)}>{children}</div>;
}

export function SectionTitle({
  children,
  action
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between px-1">
      <h2 className="font-serif text-[17px] tracking-wide text-ink/90">{children}</h2>
      {action}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('eyebrow', className)}>{children}</div>;
}

export function Chip({
  on,
  onClick,
  children,
  className
}: {
  on?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={cx('chip', on && 'chip-on', className)}>
      {children}
    </button>
  );
}

export function Sheet({
  open,
  onClose,
  children,
  title
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="fade-in absolute inset-0 bg-ink/25 backdrop-blur-[2px] dark:bg-black/50"
      />
      <div
        ref={ref}
        className="sheet-in relative max-h-[90vh] w-full overflow-hidden rounded-t-[28px] border-t border-line/70 bg-paper shadow-lift"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line/50 bg-paper/90 px-5 py-3 backdrop-blur">
          <div className="w-8" />
          <div className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-line" />
          <div className="font-serif text-[15px] text-soft">{title || ''}</div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-faint transition active:scale-90"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="sheet-scroll max-h-[calc(90vh-56px)] overflow-y-auto px-5 pb-10 pt-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function Field({
  label,
  hint,
  children,
  className
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-[12px] tracking-wide text-soft">{label}</span>
        {hint ? <span className="text-[11px] text-faint">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export function NumInput({
  value,
  onChange,
  placeholder,
  suffix,
  min = 0,
  max = 9999
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="relative flex items-center">
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return onChange(undefined);
          const n = Number(raw);
          if (Number.isNaN(n)) return;
          onChange(Math.max(min, Math.min(max, n)));
        }}
        className="field num pr-12"
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-4 text-[12px] text-faint">{suffix}</span>
      ) : null}
    </div>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full border border-line/70 bg-paper2/60 p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cx(
            'flex-1 rounded-full px-2 py-1.5 text-[12.5px] transition-all duration-300 ease-soft',
            value === o.key ? 'bg-ink text-paper shadow-sm' : 'text-soft'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  step = 5,
  min = 0,
  max = 1440,
  suffix = '分钟'
}: {
  value?: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, v - step))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-soft transition active:scale-90"
      >
        −
      </button>
      <div className="num min-w-[62px] text-center text-[15px] text-ink">
        {value == null ? <span className="text-faint">—</span> : `${v} ${suffix}`}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, v + step))}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-soft transition active:scale-90"
      >
        +
      </button>
    </div>
  );
}

export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-6">
      <div className="fade-in max-w-full rounded-full bg-ink/95 px-4 py-2.5 text-[13px] leading-snug text-paper shadow-lift">
        {msg}
      </div>
    </div>
  );
}

/** 可折叠的卡片：收起时显示一行摘要，展开后显示内容。 */
export function CollapsibleCard({
  title,
  summary,
  storageKey,
  defaultOpen = false,
  right,
  children
}: {
  title: string;
  summary?: string;
  storageKey?: string;
  defaultOpen?: boolean;
  right?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    if (!storageKey) return defaultOpen;
    try {
      const v = localStorage.getItem(`change:open:${storageKey}`);
      return v == null ? defaultOpen : v === '1';
    } catch {
      return defaultOpen;
    }
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (storageKey) {
      try {
        localStorage.setItem(`change:open:${storageKey}`, next ? '1' : '0');
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={toggle} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <div className="min-w-0">
          <div className="font-serif text-[15px] tracking-wide text-ink/90">{title}</div>
          {!open && summary ? <div className="mt-1 truncate text-[10.5px] text-faint">{summary}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          <svg
            viewBox="0 0 24 24"
            className={cx('h-3.5 w-3.5 text-faint transition-transform duration-300', open && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      {open ? <div className="px-5 pb-5">{children}</div> : null}
    </div>
  );
}

/** 一句温和的回应，用在选心情、记精力之后。 */
export function Echo({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="fade-in mt-3 flex items-start gap-2 rounded-2xl bg-moss/[0.07] px-3 py-2.5">
      <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-moss/60" />
      <p className="font-serif text-[12px] leading-[1.85] text-ink/80">{text}</p>
    </div>
  );
}

/* ---------------- icons ---------------- */

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function Icon({ name, className }: { name: string; className?: string }) {
  const cls = className || 'h-[22px] w-[22px]';
  switch (name) {
    case 'today':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
        </svg>
      );
    case 'write':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <path d="M4 20h16" />
          <path d="M6.5 16.5l9.8-9.8a2 2 0 012.8 2.8l-9.8 9.8H6.5v-2.8z" />
        </svg>
      );
    case 'review':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <path d="M5 4.5h14v15H5z" />
          <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
        </svg>
      );
    case 'lab':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <path d="M9 3.5h6M10 3.5v5.2L5.8 17a2.6 2.6 0 002.3 3.8h7.8a2.6 2.6 0 002.3-3.8L14 8.7V3.5" />
          <path d="M8 14.5h8" />
        </svg>
      );
    case 'me':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <circle cx="12" cy="8.5" r="3.4" />
          <path d="M5 20c.8-3.4 3.6-5.2 7-5.2s6.2 1.8 7 5.2" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'spark':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <path d="M12 3.5l1.6 5.1 5.1 1.6-5.1 1.6L12 17l-1.6-5.2L5.3 10.2l5.1-1.6L12 3.5z" />
          <path d="M18.5 15.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1z" />
        </svg>
      );
    case 'book':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <path d="M4 5.5A2 2 0 016 3.5h3.2A2.8 2.8 0 0112 6.3v13a2.4 2.4 0 00-2.4-2.4H4V5.5zM20 5.5a2 2 0 00-2-2h-3.2A2.8 2.8 0 0012 6.3v13a2.4 2.4 0 012.4-2.4H20V5.5z" />
        </svg>
      );
    case 'moon':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <path d="M20 14.5A8 8 0 019.5 4a8.2 8.2 0 1010.5 10.5z" />
        </svg>
      );
    case 'walk':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <circle cx="13" cy="4.6" r="1.8" />
          <path d="M10.5 21l1.2-4.6-2-2.2.8-4.4-2.6 2.1-1.6 3M12.4 9.8l2.4 1.6 1.6 3.2M15.5 21l-1.4-5.4" />
        </svg>
      );
    case 'mood':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.6 14.4c.8 1.1 2 1.7 3.4 1.7s2.6-.6 3.4-1.7M9.2 9.6h.01M14.8 9.6h.01" />
        </svg>
      );
    case 'arrow':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <path d="M5 12h13M13 6.5l5.5 5.5L13 17.5" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'trash':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <path d="M4.5 7h15M9.5 7V4.8h5V7M6.8 7l.8 12.2h8.8L17.2 7M10.4 10.6v5.4M13.6 10.6v5.4" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...base}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4" />
        </svg>
      );
    default:
      return <svg viewBox="0 0 24 24" className={cls} {...base} />;
  }
}
