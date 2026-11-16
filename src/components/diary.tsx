import { Fragment, type ReactNode } from 'react';

/** 把正文里 〔21:34〕 这样的时间标记渲染成小分隔条。 */
export function DiaryText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/〔(\d{1,2}:\d{2})〕/);
  const nodes: ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const isTime = i % 2 === 1;
    const chunk = parts[i];
    if (isTime) {
      nodes.push(
        <div key={`t-${i}`} className="mb-2 mt-5 flex items-center gap-2 text-[9.5px] tracking-[0.16em] text-faint">
          <span>{chunk}</span>
          <span className="h-px flex-1 bg-line/50" />
        </div>
      );
    } else if (chunk.trim()) {
      nodes.push(
        <p key={`p-${i}`} className="diary">
          {chunk.trim()}
        </p>
      );
    }
  }

  if (!nodes.length) return null;
  return <div className={className}>{nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</div>;
}
