import { useEffect, useRef, useState } from 'react';
import { useCore } from '../layout/AppShell';
import { useFocusZone } from '../core/focus';
import { paletteModel, usePaletteState } from '../core/palette';

const CLOSE_MS = 240;

export function CommandHUD(): React.JSX.Element | null {
  const zone = useFocusZone();
  const state = usePaletteState();
  const { registry } = useCore();
  const inputRef = useRef<HTMLInputElement>(null);
  const prevZone = useRef(zone);
  const [visible, setVisible] = useState(zone === 'palette');
  const [closing, setClosing] = useState(false);
  const [openId, setOpenId] = useState(0);

  useEffect(() => {
    const was = prevZone.current;
    prevZone.current = zone;
    if (zone === 'palette') {
      setVisible(true);
      setClosing(false);
      setOpenId((n) => n + 1);
      return;
    }
    if (was !== 'palette') return;
    setClosing(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [zone]);

  useEffect(() => {
    if (visible && !closing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [visible, closing]);

  if (!visible) return null;

  return (
    <div
      className={closing ? 'command-hud command-hud--closing' : 'command-hud command-hud--open'}
      role="dialog"
      aria-label="Komut paleti"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) void registry.run('palette.close');
      }}
    >
      <span className="command-hud__flash" aria-hidden="true" />
      <div key={openId} className="command-hud__panel holo-scan">
        <span className="command-hud__sweep" aria-hidden="true" />
        <span className="command-hud__corner command-hud__corner--tl" aria-hidden="true" />
        <span className="command-hud__corner command-hud__corner--tr" aria-hidden="true" />
        <span className="command-hud__corner command-hud__corner--bl" aria-hidden="true" />
        <span className="command-hud__corner command-hud__corner--br" aria-hidden="true" />
        <div className="command-hud__inputbar">
          <span className="command-hud__prompt" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="7" cy="7" r="4.4" />
              <line x1="10.4" y1="10.4" x2="13.8" y2="13.8" />
            </svg>
          </span>
          <input
            ref={inputRef}
            className="command-hud__input"
            type="text"
            placeholder="Komut yaz…"
            spellCheck={false}
            autoComplete="off"
            value={state.query}
            onChange={(event) => paletteModel.setQuery(event.currentTarget.value, registry.list())}
            onKeyDown={(event) => {
              if (event.key === 'Tab') event.preventDefault();
            }}
          />
        </div>
        <div className="command-hud__list" role="listbox" aria-label="Komut listesi">
          {state.items.map((item, index) => {
            const active = index === state.activeIndex;
            const className = ['command-hud__item', active ? 'command-hud__item--active' : '']
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={item.commandId}
                role="option"
                aria-selected={active}
                className={className}
                onMouseEnter={() => paletteModel.setActive(index)}
                onClick={() => {
                  paletteModel.setActive(index);
                  void registry.run('palette.confirm');
                }}
              >
                <span className="command-hud__title">{item.title}</span>
                <span className="command-hud__category">{item.category}</span>
              </div>
            );
          })}
          {state.items.length === 0 && (
            <div className="command-hud__empty" role="status">
              Eşleşme yok
            </div>
          )}
        </div>
      </div>
    </div>
  );
}