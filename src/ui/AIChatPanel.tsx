import { useEffect, useRef, useState } from 'react';
import { useAIEngine } from '../ai/engine';
import { refreshCatalog } from '../ai/catalog';
import { loadActiveRef } from '../ai/modelStore';
import { closeSession, newSession, switchSession } from '../ai/aiCommands';
import { syncChatWithActiveEnv } from '../ai/envBinding';
import { terminalModel } from '../core/terminalModel';
import { writeToActiveTerminal } from '../core/terminalRegistry';
import { sessionStore, useSessions } from '../ai/sessions';
import { useEnvironmentsState } from '../core/environments';
import { aiChatModel, useAIChat } from '../core/chatModel';
import { focusManager, useFocusZone } from '../core/focus';
import { useCore } from '../layout/AppShell';
import { phaseLabel } from '../ai/format';
import { AIKeyVault, AIModelToolbar, AIStopButton } from './AIControls';

const THINK_WORDS = ['Düşünüyor', 'Planlıyor', 'Bağlamı tarıyor', 'Kod üretiyor', 'Kontrol ediyor', 'Sentezliyor'];

export function ThinkingLine({ active = true }: { active?: boolean }): React.JSX.Element | null {
  const [tick, setTick] = useState(0);
  const [shown, setShown] = useState(active);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!shown) return;
    const timer = setInterval(() => setTick((v) => v + 1), 2400);
    return () => {
      clearInterval(timer);
    };
  }, [shown]);
  useEffect(() => {
    if (active) {
      setShown(true);
      setLeaving(false);
      return;
    }
    if (!shown) return;
    setLeaving(true);
    const fade = setTimeout(() => {
      setShown(false);
      setLeaving(false);
    }, 180);
    return () => {
      clearTimeout(fade);
    };
  }, [active, shown]);
  if (!shown) return null;
  return (
    <div
      className={leaving ? 'ai-chat__thinking ai-chat__thinking--out' : 'ai-chat__thinking'}
      role="status"
    >
      <span className="ai-chat__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="ai-chat__thinkingword" key={tick}>
        {THINK_WORDS[tick % THINK_WORDS.length]}
      </span>
    </div>
  );
}


function shellBlocks(text: string): { language: string; code: string }[] {
  const blocks: { language: string; code: string }[] = [];
  const pattern = /```([\w+-]*)\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const language = (match[1] ?? '').toLowerCase();
    const code = (match[2] ?? '').trim();
    if (language.includes('sh') || language.includes('bash') || language.includes('shell') || language.includes('zsh') || language.includes('fish')) {
      blocks.push({ language, code });
    }
  }
  return blocks;
}

function needsTerminalPermission(code: string): boolean {
  return /(^|\s)\bsudo\b/.test(code);
}

export function AIChatPanel(): React.JSX.Element | null {
  const zone = useFocusZone();
  const { registry } = useCore();
  const ai = useAIEngine();
  const chat = useAIChat();
  const sessions = useSessions();
  const envState = useEnvironmentsState();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [terminalDecisions, setTerminalDecisions] = useState<Record<string, 'pending' | 'allowed' | 'denied' | 'done'>>({});
  const busy = ai.status === 'loading' || ai.status === 'computing';
  const emptySession =
    sessions.sessions.find((session) => session.messages.length === 0 && (session.id !== sessions.activeId || ai.chat.messages.length === 0)) ??
    null;
  const emptyIsActive = emptySession !== null && emptySession.id === sessions.activeId;

  function runTerminalCommand(key: string, code: string): void {
    setTerminalDecisions((current) => ({ ...current, [key]: 'allowed' }));
    terminalModel.open();
    window.setTimeout(() => {
      const ok = writeToActiveTerminal(code.endsWith('\n') ? code : `${code}\n`);
      setTerminalDecisions((current) => ({ ...current, [key]: ok ? 'done' : 'denied' }));
    }, 400);
  }

  useEffect(() => {
    if (zone === 'ai') {
      inputRef.current?.focus();
    }
  }, [zone]);

  useEffect(() => {
    if (ai.status === 'error') {
      aiChatModel.setDraft(''); // hata sonrası gönderilebilir taslak temiz
    }
  }, [ai.status]);

  useEffect(() => {
    const list = messagesRef.current;
    if (list !== null) list.scrollTop = list.scrollHeight;
  }, [ai.chat.messages.length, ai.status]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea !== null) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [chat.draft]);

  useEffect(() => {
    const list = messagesRef.current;
    if (list !== null) list.scrollTop = list.scrollHeight;
  }, [ai.chat.messages]);

  useEffect(() => {
    if (chat.open) {
      syncChatWithActiveEnv();
      sessionStore.ensure(false);
      void refreshCatalog(window.api);
    }
  }, [chat.open]);

  if (!chat.open) return null;

  const activeRef = loadActiveRef();
  const activeSession = sessions.sessions.find((session) => session.id === sessions.activeId) ?? null;
  const boundEnvId = activeSession?.envId ?? null;
  const boundEnv =
    boundEnvId !== null
      ? envState.environments.find((env) => env.id === boundEnvId) ?? null
      : null;
  return (
    <aside
      className="ai-chat"
      aria-label="Yapay zekâ sohbeti"
      onMouseDown={() => focusManager.set('ai')}
    >
      <header className="ai-chat__header">
        <span className="ai-chat__modelname" title={activeRef.id}>
          {activeRef.id}
        </span>
        {boundEnv !== null && (
          <span className="ai-chat__project" title={boundEnv.rootPath} data-testid="ai-project-chip">
            {boundEnv.name}
          </span>
        )}
        <div className="ai-chat__meta">
          <button
            type="button"
            className="ai-chat__iconbtn"
            aria-label="Ayarlar"
            title="Ayarlar"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
          <button
            type="button"
            className="ai-chat__iconbtn"
            aria-label="Kapat"
            title="Kapat (Esc)"
            onClick={() => registry.run('ai.chat.close')}
          >
            ✕
          </button>
        </div>
      </header>
      <div className="ai-chat__tabs">
        <div className="ai-chat__tablist" role="tablist" aria-label="Sohbetler">
          {sessions.sessions.map((session) => {
            const selected = session.id === sessions.activeId;
            return (
              <div
                key={session.id}
                role="tab"
                aria-selected={selected}
                title={session.title}
                className={selected ? 'ai-chat__tab ai-chat__tab--active' : 'ai-chat__tab'}
                onClick={() => switchSession(session.id)}
              >
                <span className="ai-chat__tab-title">{session.title}</span>
                <button
                  type="button"
                  className="ai-chat__tab-close"
                  aria-label={`Kapat: ${session.title}`}
                  disabled={busy}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeSession(session.id);
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="ai-chat__tab-new"
          aria-label="Yeni sohbet"
          title={emptyIsActive ? 'Zaten açık bir yeni sohbet var' : 'Yeni sohbet'}
          disabled={busy || emptyIsActive}
          onClick={() => newSession()}
        >
          +
        </button>
      </div>
      {settingsOpen && (
        <div
          className="ai-chat__settings-modal"
          role="dialog"
          aria-label="Ayarlar"
          onClick={() => setSettingsOpen(false)}
        >
          <div className="ai-chat__settings-panel" onClick={(event) => event.stopPropagation()}>
            <div className="ai-chat__settings-title">AYARLAR</div>
            <AIKeyVault />
            <button
              type="button"
              className="ai-chat__settings-close"
              onClick={() => setSettingsOpen(false)}
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {ai.status === 'loading' && ai.progress !== null && (
        <div className="ai-chat__progress" aria-label="Model indirme ilerlemesi">
          <div className="ai-chat__progress-bar" style={{ width: `${ai.progress.percent}%` }} />
          <span className="ai-chat__progress-label">
            %{ai.progress.percent} · {phaseLabel(ai.progress.phase)}
          </span>
        </div>
      )}

      <div className="ai-chat__messages" ref={messagesRef} aria-live="polite">
        {ai.chat.messages.map((message, index) => (
          <div key={index} className={`ai-chat__message ai-chat__message--${message.role}`}>
            <span className="ai-chat__bubble">{message.content}</span>
            {message.role === 'assistant' &&
              shellBlocks(message.content).map((block, blockIndex) => {
                const blockKey = `${index}:${blockIndex}`;
                const needsPermission = needsTerminalPermission(block.code);
                const decision = terminalDecisions[blockKey] ?? (needsPermission ? 'pending' : 'idle');
                return (
                  <div key={blockKey} className="ai-chat__termblock">
                    <pre className="ai-chat__termcode">{block.code}</pre>
                    {needsPermission &&
                      (decision === 'pending' ? (
                        <div className="ai-chat__termactions">
                          <span className="ai-chat__termhint">Bu komut sudo yetkisi istiyor.</span>
                          <button
                            type="button"
                            className="ai-chat__termbtn ai-chat__termbtn--allow"
                            onClick={() =>
                              runTerminalCommand(blockKey, block.code)
                            }
                          >
                            İzin ver
                          </button>
                          <button
                            type="button"
                            className="ai-chat__termbtn ai-chat__termbtn--deny"
                            onClick={() =>
                              setTerminalDecisions((current) => ({
                                ...current,
                                [blockKey]: 'denied',
                              }))
                            }
                          >
                            Reddet
                          </button>
                        </div>
                      ) : (
                        <span className="ai-chat__termstatus">
                          {decision === 'done' ? 'Çalıştırıldı' : decision === 'denied' ? 'Reddedildi' : 'Çalıştırılıyor'}
                        </span>
                      ))}
                    {!needsPermission && (
                      <button
                        type="button"
                        className="ai-chat__termbtn"
                        onClick={() => runTerminalCommand(blockKey, block.code)}
                      >
                        {terminalDecisions[blockKey] === 'done' ? 'Çalıştı' : 'Çalıştır'}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
        <ThinkingLine
          active={
            ai.status === 'computing' &&
            ai.chat.messages[ai.chat.messages.length - 1]?.role !== 'assistant'
          }
        />
        {ai.chat.messages.length === 0 && ai.status !== 'computing' && (
          <div className="ai-chat__empty">
            <span className="ai-chat__hero" aria-hidden="true">
              FILE
            </span>
            <p className="ai-chat__greet">Seni dinliyorum, efendim.</p>
            <p className="ai-chat__hint">
              Dosya seçip “Kodu Açıkla”yı çalıştır ya da aşağıdan yazmaya başla.
              Tüm komutlar üstteki İşlemler menüsünde.
            </p>
          </div>
        )}
      </div>

      {ai.error !== null && (
        <div className="ai-chat__error" role="alert">
          {ai.error}
        </div>
      )}

      <footer className="ai-chat__footer" onKeyDown={(event) => {
        if (event.key === 'Tab') {
          event.preventDefault();
          event.stopPropagation();
          const activeSession = sessions.sessions.find((session) => session.id === sessions.activeId) ?? null;
          void registry.run(activeSession?.mode === 'plan' ? 'ai.mode.build' : 'ai.mode.plan');
        }
      }}>
        <div className="ai-chat__inputrow">
          <textarea
            ref={inputRef}
            className="ai-chat__input"
            placeholder="Mesajınızı yazın…"
            rows={1}
            spellCheck={false}
            value={chat.draft}
            onFocus={() => focusManager.set('ai')}
            onChange={(event) => aiChatModel.setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.stopPropagation();
                registry.run('ai.chat.send');
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                registry.run('ai.chat.close');
              }
            }}
          />
          <AIStopButton />
        </div>
        <AIModelToolbar />
      </footer>
    </aside>
  );
}
