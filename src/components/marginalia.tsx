import { useEffect, useState } from 'react';
import { marginalNow } from '../lib/quotes';
import { cx } from './ui';

export function Marginalia({
  book,
  salt = 0,
  className
}: {
  book?: string;
  salt?: number;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const m = marginalNow(book ?? '', salt, now);

  return (
    <div className={cx('relative pl-3.5', className)}>
      <span className="absolute left-0 top-0.5 h-[calc(100%-4px)] w-px bg-clay/25" />
      <p key={`${m.text}-${now}`} className="fade-in font-serif text-[12.5px] leading-[1.95] text-soft">
        {m.text}
      </p>
      <p className="mt-1.5 text-[9px] tracking-[0.12em] text-faint">{m.from}</p>
    </div>
  );
}
