import { useCallback, useEffect, useRef, useState } from "react";
import type { AiEnvEntry } from '../../electron/shared/api-types';
import { useCore } from '../layout/AppShell';
import { useAIEngine } from '../ai/engine';
import { selectModel } from '../ai/aiCommands';
import { refreshCatalogIfStale, useModelCatalog } from '../ai/catalog';
import { loadActiveRef } from '../ai/modelStore';
import { displayName, getProvider, PROVIDERS, type ModelRef, type ProviderId } from '../ai/providers';
import { useSessions } from '../ai/sessions';



export function AIModelToolbar(): React.JSX.Element {
  const { registry } = useCore();
  const catalog = useModelCatalog();
  const sessions = useSessions();
  const [open, setOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);
  const effortRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const ref = loadActiveRef();
  const activeSession = sessions.sessions.find((session) => session.id === sessions.activeId) ?? null;
  const mode = activeSession?.mode ?? 'build';
  const effort = activeSession?.effort ?? 'medium';
  const value = `${ref.provider}:${ref.id}`;

  useEffect(() => {
    if (!effortOpen) return;
    const onDown = (event: MouseEvent): void => {
      if (effortRef.current !== null && !effortRef.current.contains(event.target as Node)) setEffortOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setEffortOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [effortOpen]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => searchRef.current?.focus());
      void refreshCatalogIfStale(window.api);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  const groups = new Map<string, ModelRef[]>();
  for (const entry of catalog.entries) {
    const providerName = getProvider(entry.provider)?.name ?? entry.provider;
    const haystack = `${entry.name} ${entry.id} ${providerName}`.toLowerCase();
    if (query.length > 0 && !haystack.includes(query.toLowerCase())) continue;
    const list = groups.get(providerName) ?? [];
    list.push(entry);
    groups.set(providerName, list);
  }
  const filtered = [...groups.values()].flat();

  function selectEntry(entry: ModelRef): void {
    selectModel(entry);
    setOpen(false);
  }

  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = filtered[0];
      if (first !== undefined) selectEntry(first);
    }
  }

  return (
    <div className="ai-chat__toolbar">
      <button
        type="button"
        className={mode === 'plan' ? 'ai-chat__modebtn ai-chat__modebtn--plan' : 'ai-chat__modebtn ai-chat__modebtn--build'}
        aria-label="Mod"
        onClick={() => void registry.run(mode === 'plan' ? 'ai.mode.build' : 'ai.mode.plan')}
      >
        {mode === 'plan' ? 'Plan' : 'Yapım'}
      </button>
      <button
        type="button"
        className="ai-chat__modelopen"
        aria-label="Model seç"
        onClick={() => setOpen(true)}
      >
        {catalog.entries.find((entry) => `${entry.provider}:${entry.id}` === value)?.name ?? value}
      </button>
      <div className="ai-chat__effortwrap" ref={effortRef}>
        <button
          type="button"
          className={effortOpen ? 'ai-chat__effortsel ai-chat__effortsel--open' : 'ai-chat__effortsel'}
          aria-label="Efor"
          title="Efor"
          aria-haspopup="listbox"
          aria-expanded={effortOpen}
          onClick={() => setEffortOpen((v) => !v)}
        >
          <span className="ai-chat__effortlabel">
            {effort === 'low' ? 'Düşük' : effort === 'ultra' ? 'Ultra' : 'Orta'}
          </span>
        </button>
        {effortOpen && (
          <div className="ai-chat__effortmenu" role="listbox" aria-label="Efor seç">
            {(
              [
                ['ultra', 'Ultra'],
                ['medium', 'Orta'],
                ['low', 'Düşük'],
              ] as const
            ).map(([level, label]) => (
              <button
                key={level}
                type="button"
                role="option"
                aria-selected={effort === level}
                className={effort === level ? 'ai-chat__effortopt ai-chat__effortopt--active' : 'ai-chat__effortopt'}
                onClick={() => {
                  void registry.run(`ai.effort.${level}`);
                  setEffortOpen(false);
                }}
              >
                <span className="ai-chat__effortdot" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {open && (
        <div
          className="ai-chat__centermodal"
          role="dialog"
          aria-label="Model seç"
          onClick={() => setOpen(false)}
        >
          <div className="ai-chat__centerpanel" onClick={(event) => event.stopPropagation()}>
            <div className="ai-chat__centertitle">MODEL SEÇ</div>
            <input
              ref={searchRef}
              className="ai-chat__modalsearch"
              aria-label="Model ara"
              placeholder="Model ara..."
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={handleEnter}
            />
            <div className="ai-chat__modallist">
              {[...groups.entries()].map(([label, entries]) => (
                <div key={label} className="ai-chat__modalgroup">
                  <div className="ai-chat__modalgrouplabel">{label}</div>
                  {entries.map((entry) => (
                    <button
                      key={`${entry.provider}:${entry.id}`}
                      type="button"
                      className={
                        `${entry.provider}:${entry.id}` === value
                          ? 'ai-chat__modalopt ai-chat__modalopt--active'
                          : 'ai-chat__modalopt'
                      }
                      onClick={() => selectEntry(entry)}
                    >
                      {displayName(entry)}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AIStopButton(): React.JSX.Element {
  const { registry } = useCore();
  const ai = useAIEngine();
  const busy = ai.status === 'loading' || ai.status === 'computing';
  return (
    <button
      type="button"
      className={busy ? 'ai-chat__stop ai-chat__stop--busy' : 'ai-chat__stop ai-chat__stop--idle'}
      aria-label="Durdur"
      title="Durdur"
      onClick={() => registry.run('ai.models.cancel')}
    />
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

export const AI_QUICK_COMMANDS: readonly { readonly label: string; readonly command: string }[] =
  AI_ACTION_GROUPS.flatMap((group) => group.items).filter(
    (item) =>
      item.command !== 'ai.session.new' &&
      item.command !== 'ai.session.close' &&
      item.command !== 'ai.model.status' &&
      item.command !== 'ai.models.download' &&
      item.command !== 'ai.prefs',
  );

export const AI_SETTINGS_COMMANDS: readonly { readonly label: string; readonly command: string }[] =
  AI_ACTION_GROUPS.flatMap((group) => group.items).filter(
    (item) =>
      item.command === 'ai.session.new' ||
      item.command === 'ai.session.close' ||
      item.command === 'ai.model.status' ||
      item.command === 'ai.models.download' ||
      item.command === 'ai.prefs',
  );

export function AIQuickActions(): React.JSX.Element {
  const { registry } = useCore();
  return (
    <div className="ai-chat__quick-actions" aria-label="Hızlı komutlar">
      {AI_QUICK_COMMANDS.map((item) => (
        <button
          key={item.command}
          type="button"
          className="ai-chat__quick-btn"
          onClick={() => registry.run(item.command)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function AISettingsCommands(): React.JSX.Element {
  const { registry } = useCore();
  return (
    <div className="ai-chat__settings-list" aria-label="Ayarlar komutları">
      {AI_SETTINGS_COMMANDS.map((item) => (
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
  );
}

export function AIActionsMenu(): React.JSX.Element {
  return <AIQuickActions />;
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
    <div className="ai-chat__keys">
      <div className="ai-chat__keys-title">Anahtarlar</div>
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
    </div>
  );
}
