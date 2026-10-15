import { useCallback, useEffect, useState } from 'react';
import type { AiEnvEntry } from '../../electron/shared/api-types';
import { useCore } from '../layout/AppShell';
import { selectModel } from '../ai/aiCommands';
import { useModelCatalog } from '../ai/catalog';
import { loadActiveRef } from '../ai/modelStore';
import { displayName, PROVIDERS, type ModelRef, type ProviderId } from '../ai/providers';
import { useSessions } from '../ai/sessions';

function groupLabel(source: string): string {
  if (source === 'builtin') return 'Yerleşik';
  if (source === 'cloud') return 'Bulut';
  return 'Yerel sunucu';
}

export function AIModelToolbar(): React.JSX.Element {
  const { registry } = useCore();
  const catalog = useModelCatalog();
  const sessions = useSessions();
  const [, setTick] = useState(0);
  const ref = loadActiveRef();
  const activeSession = sessions.sessions.find((session) => session.id === sessions.activeId) ?? null;
  const mode = activeSession?.mode ?? 'plan';
  const effort = activeSession?.effort ?? 'medium';
  const value = `${ref.provider}:${ref.id}`;

  const groups = new Map<string, ModelRef[]>();
  for (const entry of catalog.entries) {
    const label = groupLabel(entry.source);
    const list = groups.get(label) ?? [];
    list.push(entry);
    groups.set(label, list);
  }

  return (
    <div className="ai-chat__toolbar">
      <select
        className="ai-chat__modelsel"
        aria-label="Model seç"
        title="Model seç"
        value={catalog.entries.some((entry) => `${entry.provider}:${entry.id}` === value) ? value : ''}
        onChange={(event) => {
          const [provider, ...rest] = event.currentTarget.value.split(':');
          const id = rest.join(':');
          const found = catalog.entries.find((entry) => entry.provider === provider && entry.id === id);
          if (found !== undefined) {
            selectModel(found);
            setTick((tick) => tick + 1);
          }
        }}
      >
        {value === '' && <option value="">Model yok</option>}
        {[...groups.entries()].map(([label, entries]) => (
          <optgroup key={label} label={label}>
            {entries.map((entry) => (
              <option key={`${entry.provider}:${entry.id}`} value={`${entry.provider}:${entry.id}`}>
                {displayName(entry)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <button
        type="button"
        className="ai-chat__iconbtn"
        aria-label="Modelleri yenile"
        title="Modelleri yenile"
        onClick={() => registry.run('ai.models.refresh')}
      >
        ⟳
      </button>
      <div className="ai-chat__modeseg" role="group" aria-label="Kip">
        <button
          type="button"
          aria-pressed={mode === 'plan'}
          className={mode === 'plan' ? 'ai-chat__modebtn ai-chat__modebtn--on' : 'ai-chat__modebtn'}
          onClick={() => registry.run('ai.mode.plan')}
        >
          Plan
        </button>
        <button
          type="button"
          aria-pressed={mode === 'build'}
          className={mode === 'build' ? 'ai-chat__modebtn ai-chat__modebtn--on' : 'ai-chat__modebtn'}
          onClick={() => registry.run('ai.mode.build')}
        >
          Yapım
        </button>
      </div>
      <select
        className="ai-chat__effortsel"
        aria-label="Efor"
        title="Efor"
        value={effort}
        onChange={(event) => {
          const level = event.currentTarget.value;
          if (level === 'low' || level === 'medium' || level === 'ultra') {
            void registry.run(`ai.effort.${level}`);
          }
        }}
      >
        <option value="low">Düşük</option>
        <option value="medium">Orta</option>
        <option value="ultra">Ultra</option>
      </select>
    </div>
  );
}

type KeyRow = {
  readonly provider: ProviderId;
  readonly name: string;
  readonly hasKey: boolean;
  readonly envPresent: boolean;
};

export type ActionGroup = {
  readonly label: string;
  readonly items: readonly { readonly label: string; readonly command: string }[];
};

export const AI_ACTION_GROUPS: readonly ActionGroup[] = [
  {
    label: 'Sohbet',
    items: [
      { label: 'Yeni Sohbet', command: 'ai.session.new' },
      { label: 'Sekmeyi Kapat', command: 'ai.session.close' },
    ],
  },
  {
    label: 'Kod',
    items: [
      { label: 'Satır İçi Tamamlama', command: 'ai.inline.complete' },
      { label: 'Kodu Açıkla', command: 'ai.explain' },
      { label: 'Öneriyi Uygula', command: 'ai.apply' },
      { label: 'Öneriyi Onayla', command: 'ai.apply.confirm' },
      { label: 'Öneriyi Vazgeç', command: 'ai.apply.cancel' },
    ],
  },
  {
    label: 'Model',
    items: [
      { label: 'Model Seç', command: 'ai.model.select' },
      { label: 'Modelleri Yenile', command: 'ai.models.refresh' },
      { label: 'Model Durumu', command: 'ai.model.status' },
      { label: 'Model İndir', command: 'ai.models.download' },
      { label: 'Yapay Zekâ Tercihleri', command: 'ai.prefs' },
    ],
  },
];

export function AIActionsMenu(): React.JSX.Element {
  const { registry } = useCore();
  return (
    <details className="ai-chat__ops">
      <summary className="ai-chat__ops-title">İşlemler</summary>
      {AI_ACTION_GROUPS.map((group) => (
        <div key={group.label} className="ai-chat__ops-group">
          <div className="ai-chat__ops-label">{group.label}</div>
          {group.items.map((item) => (
            <button
              key={item.command}
              type="button"
              className="ai-chat__ops-btn"
              onClick={() => registry.run(item.command)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </details>
  );
}

const KEY_PROVIDERS = PROVIDERS.filter((provider) => provider.keyEnv !== null);

export function AIKeyVault(): React.JSX.Element {
  const [provider, setProvider] = useState<ProviderId>('openai');
  const [secret, setSecret] = useState('');
  const [rows, setRows] = useState<readonly KeyRow[]>([]);

  const reload = useCallback(async (): Promise<void> => {
    const candidates = KEY_PROVIDERS.map((entry) => ({ provider: entry.id, envVar: entry.keyEnv }));
    const env: readonly AiEnvEntry[] = await window.api.aiEnvScan(candidates).catch(() => []);
    const out: KeyRow[] = [];
    for (const entry of KEY_PROVIDERS) {
      const has = await window.api.aiKeyHas(entry.id).catch(() => ({ present: false }));
      out.push({
        provider: entry.id,
        name: entry.name,
        hasKey: has.present,
        envPresent: env.find((row) => row.provider === entry.id)?.present ?? false,
      });
    }
    setRows(out);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = async (): Promise<void> => {
    if (secret.trim().length === 0) return;
    await window.api.aiKeySet({ provider, key: secret }).catch(() => ({ ok: false }));
    setSecret('');
    await reload();
  };

  const remove = async (): Promise<void> => {
    await window.api.aiKeyDelete({ provider }).catch(() => ({ ok: false }));
    await reload();
  };

  return (
    <details className="ai-chat__keys">
      <summary className="ai-chat__keys-title">Anahtarlar</summary>
      <ul className="ai-chat__keylist">
        {rows.map((row) => (
          <li key={row.provider} className="ai-chat__keyrow">
            <span className="ai-chat__keyname">{row.name}</span>
            <span className="ai-chat__keystate">
              {row.hasKey ? 'Kasa ✓' : row.envPresent ? 'Env ✓' : 'Yok'}
            </span>
          </li>
        ))}
      </ul>
      <label className="ai-chat__keylabel">
        Sağlayıcı
        <select
          aria-label="Sağlayıcı"
          value={provider}
          onChange={(event) => setProvider(event.currentTarget.value as ProviderId)}
        >
          {KEY_PROVIDERS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      <div className="ai-chat__keyform">
        <input
          type="password"
          aria-label="API anahtarı"
          placeholder="sk-…"
          autoComplete="off"
          spellCheck={false}
          value={secret}
          onChange={(event) => setSecret(event.currentTarget.value)}
        />
        <button type="button" className="holo-btn holo-btn--primary" onClick={() => void save()}>
          Kaydet
        </button>
        <button type="button" className="holo-btn holo-btn--danger" onClick={() => void remove()}>
          Sil
        </button>
      </div>
    </details>
  );
}
