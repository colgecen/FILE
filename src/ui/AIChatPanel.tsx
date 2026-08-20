import { useEffect, useRef } from 'react';
import { useAIEngine } from '../ai/engine';
import { aiChatModel, useAIChat } from '../core/chatModel';
import { useFocusZone } from '../core/focus';
import { useCore } from '../layout/AppShell';
import { phaseLabel, statusLabel } from '../ai/format';

export function AIChatPanel(): React.JSX.Element | null {
  const zone = useFocusZone();
  const { registry } = useCore();
  const ai = useAIEngine();
  const chat = useAIChat();
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  if (!chat.open) return null;

  return (
    <aside className="ai-chat" aria-label="Yapay zekâ sohbeti">
      <header className="ai-chat__header">
        <span className="ai-chat__title">Yapay Zekâ</span>
        <span className="ai-chat__status" data-status={ai.status}>
          {ai.status === 'loading' && ai.progress !== null
            ? `${statusLabel(ai.status)} %${ai.progress.percent}`
            : statusLabel(ai.status)}
        </span>
      </header>
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
      <div className="ai-chat__messages" aria-live="polite">
        {ai.chat.messages.map((message, index) => (
          <div key={index} className={`ai-chat__message ai-chat__message--${message.role}`}>
            {message.content}
          </div>
        ))}
        {ai.chat.messages.length === 0 && (
          <div className="ai-chat__empty">Model seçilip yazdığınızda sohbet burada başlar.</div>
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
          rows={2}
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
        <button
          type="button"
          className="ai-chat__close"
          onClick={() => registry.run('ai.chat.close')}
        >
          Kapat
        </button>
      </footer>
    </aside>
  );
}