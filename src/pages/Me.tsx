import { useRef, useState } from 'react';
import { downloadJSON, useApp } from '../lib/store';
import { Card, Eyebrow, Seg, Icon } from '../components/ui';
import { testConnection } from '../lib/llm';
import { activeDate } from '../lib/date';
import type { AppState } from '../types';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 px-2">
        <Eyebrow>{title}</Eyebrow>
      </div>
      <Card className="divide-y divide-line/50 overflow-hidden">{children}</Card>
    </div>
  );
}

function Row({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="text-[13px] text-ink/90">{label}</div>
        {hint ? <div className="mt-0.5 text-[10px] leading-relaxed text-faint">{hint}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function Me() {
  const { state, setSettings, replaceState, resetAll, toast, demo } = useApp();
  const s = state.settings;
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as AppState;
      if (!data || !Array.isArray(data.entries)) throw new Error('这不是 change 的备份文件');
      replaceState(data);
      toast('导入成功');
    } catch (err) {
      toast(err instanceof Error ? err.message : '导入失败');
    }
  };

  const runTest = async () => {
    setTesting(true);
    try {
      await testConnection(s);
      toast('连上了');
    } catch (err) {
      toast(err instanceof Error ? err.message : '连不上');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="px-5">
      <header className="pt-safe px-1 pb-5">
        <Eyebrow>我</Eyebrow>
        <h1 className="mt-1.5 font-serif text-[26px] leading-tight tracking-wide text-ink">
          这台机器的主人
        </h1>
        <p className="mt-2 text-[12px] leading-relaxed text-soft">
          已记录 {state.entries.length} 天 · {state.experiments.length} 个实验 · 数据只在这台设备上
        </p>
      </header>

      <Group title="称呼">
        <Row label="怎么称呼你" hint="只用在问候里">
          <input
            value={s.name}
            onChange={(e) => setSettings({ name: e.target.value })}
            placeholder="不填也行"
            className="w-32 rounded-xl bg-paper2/70 px-3 py-1.5 text-right text-[13px] outline-none"
          />
        </Row>
        <Row label="最近在读" hint="会出现在今日页">
          <input
            value={s.book}
            onChange={(e) => setSettings({ book: e.target.value })}
            placeholder="比如 5% 的改变"
            className="w-40 rounded-xl bg-paper2/70 px-3 py-1.5 text-right text-[13px] outline-none"
          />
        </Row>
      </Group>

      <Group title="外观">
        <div className="px-4 py-3.5">
          <Seg
            options={[
              { key: 'auto', label: '跟随系统' },
              { key: 'light', label: '浅色' },
              { key: 'dark', label: '深色' }
            ]}
            value={s.theme}
            onChange={(v) => setSettings({ theme: v })}
          />
        </div>
      </Group>

      <Group title="分析用的模型">
        <Row label="接口地址" hint="OpenAI 兼容格式">
          <input
            value={s.baseUrl}
            onChange={(e) => setSettings({ baseUrl: e.target.value })}
            className="w-40 rounded-xl bg-paper2/70 px-3 py-1.5 text-right text-[11.5px] outline-none"
            placeholder="https://api.deepseek.com"
          />
        </Row>
        <Row label="模型">
          <input
            value={s.model}
            onChange={(e) => setSettings({ model: e.target.value })}
            className="w-36 rounded-xl bg-paper2/70 px-3 py-1.5 text-right text-[12px] outline-none"
            placeholder="deepseek-chat"
          />
        </Row>
        <div className="px-4 py-3.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] text-ink/90">API Key</span>
            <button type="button" onClick={() => setShowKey((v) => !v)} className="text-[10.5px] text-faint">
              {showKey ? '隐藏' : '显示'}
            </button>
          </div>
          <input
            type={showKey ? 'text' : 'password'}
            value={s.apiKey}
            onChange={(e) => setSettings({ apiKey: e.target.value })}
            placeholder="sk-..."
            autoComplete="off"
            className="field text-[13px]"
          />
          <div className="mt-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={runTest}
              disabled={testing || !s.apiKey.trim()}
              className="text-[11.5px] text-moss disabled:opacity-40"
            >
              {testing ? '正在试…' : '试一下连接'}
            </button>
            <span className="text-[10px] text-faint">Key 只存在本机</span>
          </div>
          <p className="mt-3 rounded-xl bg-paper2/60 p-3 text-[10.5px] leading-relaxed text-faint">
            只有在你在「今日」里点「看一眼」时，才会把当天和最近一周的记录发给你配置的模型。不点就不发。每天的分析会消耗一点 token，通常一次不到一分钱。
          </p>
        </div>
      </Group>

      <Group title="数据">
        <button
          type="button"
          onClick={() => {
            downloadJSON(state);
            toast('导出中');
          }}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <span className="text-[13px] text-ink/90">导出备份</span>
          <span className="text-[11px] text-faint">JSON ↓</span>
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <span className="text-[13px] text-ink/90">导入备份</span>
          <span className="text-[11px] text-faint">选择文件</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (window.confirm('清空所有记录和实验？这个动作不能撤销，建议先导出备份。')) {
              resetAll();
              toast('已经清空');
            }
          }}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <span className="text-[13px] text-clay">清空全部数据</span>
          <Icon name="trash" className="h-3.5 w-3.5 text-clay/70" />
        </button>
        <a
          href={`${window.location.pathname}?demo=1#/today`}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <span className="text-[13px] text-ink/90">看看有数据的样子</span>
          <span className="text-[11px] text-faint">示例模式 →</span>
        </a>
      </Group>

      <Card className="mb-4 p-5">
        <div className="font-serif text-[15px] text-ink/90">为什么是这个样子</div>
        <p className="mt-2 text-[11.5px] leading-[1.9] text-soft">
          change 不设目标、不排名、不提醒你「又断了几天」。它只做两件事：把每天的数据留下来，和在你想看的时候，陪你看一眼。改变是长期的事，结论要等你自己的数据说出来。
        </p>
        <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
          版本 0.2.0 · 2026 年 {activeDate().slice(5, 7)} 月 · {demo ? '示例模式（不保存）' : '本地存储'}
        </p>
      </Card>

      <p className="pb-4 text-center text-[10px] tracking-[0.2em] text-faint">CHANGE · 研究你自己</p>
    </div>
  );
}
