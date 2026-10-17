import { useEffect, useRef, useState } from 'react';
import { useTabsState } from '../core/tabs';

function segmentsOf(path: string): readonly string[] {
  const parts = path.split('/').filter((part) => part.length > 0);
  return parts.slice(-3);
}

export function Breadcrumb(): React.JSX.Element | null {
  const { tabs, activeId } = useTabsState();
  const activeFile = tabs.find((tab) => tab.id === activeId)?.file ?? null;
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditing(false);
  }, [activeFile?.path]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (activeFile === null) return null;
  const crumbs = segmentsOf(activeFile.path);

  if (editing) {
    return (
      <nav className="breadcrumb" aria-label="Dosya yolu">
        <input
          ref={inputRef}
          className="breadcrumb__fullpath"
          value={activeFile.path}
          readOnly
          spellCheck={false}
          onFocus={(event) => event.target.select()}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === 'Enter') setEditing(false);
          }}
        />
      </nav>
    );
  }

  return (
    <nav className="breadcrumb" aria-label="Dosya yolu">
      <button
        type="button"
        className="breadcrumb__reveal"
        title={`${activeFile.path} — tam yolu göster/kopyala`}
        onClick={() => setEditing(true)}
      >
        {crumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="breadcrumb__crumb">
            {index > 0 && (
              <span className="breadcrumb__sep" aria-hidden="true">
                ›
              </span>
            )}
            <span
              className={
                index === crumbs.length - 1 ? 'breadcrumb__item breadcrumb__item--active' : 'breadcrumb__item'
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </button>
    </nav>
  );
}
