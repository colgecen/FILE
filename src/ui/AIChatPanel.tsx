import { useEffect, useRef, useState } from 'react';
import { useAIEngine } from '../ai/engine';
import { refreshCatalog } from '../ai/catalog';
import { loadActiveRef } from '../ai/modelStore';
import { closeSession, newSession, switchSession } from '../ai/aiCommands';
import { terminalModel } from '../core/terminalModel';
import { writeToActiveTerminal } from '../core/terminalRegistry';
import { sessionStore, useSessions } from '../ai/sessions';
import { aiChatModel, useAIChat } from '../core/chatModel';
import { useFocusZone } from '../core/focus';
import { useCore } from '../layout/AppShell';
import { phaseLabel, statusLabel } from '../ai/format';
import { AIKeyVault, AIModelToolbar } from './AIControls';

function roleLabel(role: string): string {
  if (role === 'user') return 'SEN';
  if (role === 'assistant') return 'YZ';
  return 'SİS';
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [terminalDecisions, setTerminalDecisions] = useState<Record<string, 'pending' | 'allowed' | 'denied' | 'done'>>({});
  const busy = ai.status === 'loading' || ai.status === 'computing';

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
    const list = messagesRef.current;
    if (list !== null) list.scrollTop = list.scrollHeight;
  }, [ai.chat.messages]);

  useEffect(() => {
    if (chat.open) {
      sessionStore.ensure(false);
      void refreshCatalog(window.api);
    }
  }, [chat.open]);

  if (!chat.open) return null;

  const activeRef = loadActiveRef();
  return (
    <aside className="ai-chat" aria-label="Yapay zekâ sohbeti">
      {sessions.sessions.length > 0 && (
        <div className="ai-chat__tabs" role="tablist" aria-label="Sohbetler">
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
          <button
            type="button"
            className="ai-chat__tab-new"
            aria-label="Yeni sohbet"
            title="Yeni sohbet"
            disabled={busy}
            onClick={() => newSession()}
          >
            +
          </button>
        </div>
      )}
      <header className="ai-chat__header">
        <div className="ai-chat__brand">
          <span className="ai-chat__mark" aria-hidden="true">
            ◈
          </span>
          <span className="ai-chat__title">Asistan & YZ</span>
        </div>
        <div className="ai-chat__meta">
          <span className="ai-chat__status" data-status={ai.status}>
            <span className="ai-chat__dot" aria-hidden="true" />
            {ai.status === 'loading' && ai.progress !== null
              ? `${statusLabel(ai.status)} %${ai.progress.percent}`
              : statusLabel(ai.status)}
          </span>
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

      <div className="ai-chat__modelbar">
        <span className="ai-chat__modellabel">MODEL</span>
        <span className="ai-chat__modelname">{activeRef.id}</span>
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
            <span className="ai-chat__avatar" aria-hidden="true">
              {roleLabel(message.role)}
            </span>
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
        {ai.status === 'computing' && (
          <div className="ai-chat__thinking" role="status">
            <span className="ai-chat__avatar" aria-hidden="true">
              YZ
            </span>
            <span className="ai-chat__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        {ai.chat.messages.length === 0 && ai.status !== 'computing' && (
          <div className="ai-chat__empty">
            <span className="ai-chat__hero" aria-hidden="true">
              ◈
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
          const activeSession = sessions.sessions.find((session) => session.id === sessions.activeId) ?? null;
          void registry.run(activeSession?.mode === 'plan' ? 'ai.mode.build' : 'ai.mode.plan');
        }
      }}>
        <textarea
          ref={inputRef}
          className="ai-chat__input"
          placeholder="Mesajınızı yazın…"
          rows={3}
          spellCheck={false}
          value={chat.draft}
          onChange={(event) => aiChatModel.setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              registry.run('ai.chat.send');
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              registry.run('ai.chat.close');
            }
          }}
        />
        <AIModelToolbar />
        <div className="ai-chat__actions">
          <span className="ai-chat__keyhint" aria-hidden="true">
            Enter gönder · Shift+Enter satır · Tab kip değiştir
          </span>
        </div>
      </footer>
    </aside>
  );
}
