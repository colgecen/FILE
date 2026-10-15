import { useEffect, useRef } from 'react';
import { useAIEngine } from '../ai/engine';
import { modelName } from '../ai/models';
import { closeSession, newSession, switchSession } from '../ai/aiCommands';
import { useSessions } from '../ai/sessions';
import { aiChatModel, useAIChat } from '../core/chatModel';
import { useFocusZone } from '../core/focus';
import { useCore } from '../layout/AppShell';
import { phaseLabel, statusLabel } from '../ai/format';
import { Waveform } from './Waveform';

function roleLabel(role: string): string {
  if (role === 'user') return 'SEN';
  if (role === 'assistant') return 'YZ';
  return 'SİS';
}

export function AIChatPanel(): React.JSX.Element | null {
  const zone = useFocusZone();
  const { registry } = useCore();
  const ai = useAIEngine();
  const chat = useAIChat();
  const sessions = useSessions();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const busy = ai.status === 'loading' || ai.status === 'computing';

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

  if (!chat.open) return null;

  const draftEmpty = chat.draft.trim().length === 0;

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
        <span className="ai-chat__modelname">
          {ai.modelId === null ? 'Seçilmedi' : modelName(ai.modelId)}
        </span>
      </div>

      <div className="ai-chat__signal">
        <span className="ai-chat__signal-label" aria-hidden="true">
          SİNYAL
        </span>
        <Waveform active={ai.status === 'computing' || ai.status === 'loading'} />
      </div>

      {ai.status === 'loading' && ai.progress !== null && (
        <div className="ai-chat__progress" aria-label="Model indirme ilerlemesi">
          <div className="ai-chat__progress-bar" style={{ width: `${ai.progress.percent}%` }} />
          <span className="ai-chat__progress-label">
            %{ai.progress.percent} · {phaseLabel(ai.progress.phase)}
          </span>
        </div>
      )}
      {(ai.status === 'loading' || ai.status === 'computing') && (
        <button
          type="button"
          className="ai-chat__stop"
          onClick={() => registry.run('ai.models.cancel')}
        >
          Durdur
        </button>
      )}

      <div className="ai-chat__messages" ref={messagesRef} aria-live="polite">
        {ai.chat.messages.map((message, index) => (
          <div key={index} className={`ai-chat__message ai-chat__message--${message.role}`}>
            <span className="ai-chat__avatar" aria-hidden="true">
              {roleLabel(message.role)}
            </span>
            <span className="ai-chat__bubble">{message.content}</span>
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
            </p>
            <div className="ai-chat__chips">
              <button type="button" onClick={() => registry.run('ai.explain')}>
                Kodu Açıkla
              </button>
              <button type="button" onClick={() => registry.run('ai.model.select')}>
                Model Seç
              </button>
              <button type="button" onClick={() => registry.run('ai.model.status')}>
                Model Durumu
              </button>
            </div>
          </div>
        )}
      </div>

      {ai.error !== null && (
        <div className="ai-chat__error" role="alert">
          {ai.error}
        </div>
      )}

      <footer className="ai-chat__footer">
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
        <div className="ai-chat__actions">
          <span className="ai-chat__keyhint" aria-hidden="true">
            Enter gönder · Shift+Enter satır
          </span>
          <button
            type="button"
            className="ai-chat__send"
            disabled={draftEmpty}
            onClick={() => registry.run('ai.chat.send')}
          >
            Gönder ❯
          </button>
        </div>
      </footer>
    </aside>
  );
}
