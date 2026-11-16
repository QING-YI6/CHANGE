export const SCRATCH_IDLE_MS = 8 * 60 * 1000;
export const SCRATCH_FLUSH_EVENT = 'change:scratch-flushed';
const PREFIX = 'change:draft:';

export interface Draft {
  text: string;
  updatedAt: number;
}

export function draftKey(date: string): string {
  return `${PREFIX}${date}`;
}

export function readDraft(date: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(date));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(date: string, text: string) {
  try {
    if (text.trim()) localStorage.setItem(draftKey(date), JSON.stringify({ text, updatedAt: Date.now() }));
    else localStorage.removeItem(draftKey(date));
  } catch {
    /* 存不进去也不影响当下使用 */
  }
}

export function removeDraft(date: string) {
  try {
    localStorage.removeItem(draftKey(date));
  } catch {
    /* ignore */
  }
}

export function listDrafts(): { date: string; draft: Draft }[] {
  const out: { date: string; draft: Draft }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const draft = JSON.parse(raw) as Draft;
        if (draft && typeof draft.text === 'string') out.push({ date: key.slice(PREFIX.length), draft });
      } catch {
        /* ignore broken entry */
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function stampOf(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 把一段此刻追加到手记正文，带 〔HH:MM〕 时间戳。 */
export function appendBody(body: string, text: string, at: number): string {
  const prev = body.trim();
  const block = `〔${stampOf(at)}〕\n${text.trim()}`;
  return prev ? `${prev}\n\n${block}` : block;
}
