import { useEffect, useRef } from 'react';
import { useCore } from '../layout/AppShell';
import { useFocusZone } from '../core/focus';
import { paletteModel, usePaletteState } from '../core/palette';

export function CommandHUD(): React.JSX.Element | null {
  const zone = useFocusZone();
  const state = usePaletteState();
  const { registry } = useCore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (zone === 'palette') {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [zone]);

  if (zone !== 'palette') return null;

  return (
    <div
      className="command-hud"
      role="dialog"
      aria-label="Komut paleti"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) void registry.run('palette.close');
      }}
    >
      <div className="command-hud__panel holo-scan">
        <span className="command-hud__corner command-hud__corner--tl" aria-hidden="true" />
        <span className="command-hud__corner command-hud__corner--tr" aria-hidden="true" />
        <span className="command-hud__corner command-hud__corner--bl" aria-hidden="true" />
        <span className="command-hud__corner command-hud__corner--br" aria-hidden="true" />
        <div className="command-hud__inputbar">
          <span className="command-hud__prompt" aria-hidden="true">
            ❯
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