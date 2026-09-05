import { useEffect, useRef, useState } from 'react';
import { gitModel, useGitPanelState } from '../core/gitModel';
import { reportError } from '../core/appErrors';
import { useFocusZone, focusManager } from '../core/focus';

export function GitPanel(): React.JSX.Element | null {
  const state = useGitPanelState();
  const zone = useFocusZone();
  const isGit = zone === 'git';
  const selected = state.selected;
  const [message, setMessage] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.files.length === 0 && selected !== 0) gitModel.setSelected(0);
    else if (selected >= state.files.length) gitModel.setSelected(Math.max(0, state.files.length - 1));
  }, [state.files.length, selected]);

  const cwd = state.rootPath ?? state.branch ?? '.';
  const files = state.files;
  const staged = state.staged;
  const unstaged = files.filter((file) => !staged.has(file.path));
  const stagedList = files.filter((file) => staged.has(file.path));

  const refresh = (): void => {
    const path = state.rootPath ?? '.';
    void gitModel.loadStatus(window.api, path);
  };

  const doStage = async (path: string): Promise<void> => {
    const result = await window.api.gitAdd(cwd, [path]);
    if (result.ok) gitModel.setStaged(path, true);
    else reportError(result.error ?? 'Stage başarısız');
  };

  const doUnstage = async (path: string): Promise<void> => {
    const result = await window.api.gitRestore(cwd, [path]);
    if (result.ok) gitModel.setStaged(path, false);
    else reportError(result.error ?? 'Unstage başarısız');
  };

  const doCommit = async (): Promise<void> => {
    if (message.trim().length === 0) {
      reportError('Commit mesajı boş');
      return;
    }
    const result = await window.api.gitCommit(cwd, message);
    if (result.ok) {
      setMessage('');
      void gitModel.loadStatus(window.api, cwd);
    } else reportError(result.error ?? 'Commit başarısız');
  };

  const doPush = async (): Promise<void> => {
    const result = await window.api.gitPush(cwd);
    if (!result.ok) reportError(result.error ?? 'Push başarısız');
    else void gitModel.loadStatus(window.api, cwd);
  };

  const doPull = async (): Promise<void> => {
    const result = await window.api.gitPull(cwd);
    if (!result.ok) reportError(result.error ?? 'Pull başarısız');
    else void gitModel.loadStatus(window.api, cwd);
  };

  if (!state.rootPath && !isGit) {
    // kapalıysa AppShell'de koşullu gösterilecek — burada null dönmeyelim, panel her zaman var ama gizli değil
  }

  return (
    <div className="git-panel" role="complementary" aria-label="Git">
      <div className="git-panel__header">
        <span className="git-panel__branch" title={state.branch ?? 'Dal yok'}>
          {state.branch ? `⑂ ${state.branch}${state.dirty ? ' • değişik' : ''}` : 'Git deposu değil'}
        </span>
        <button type="button" className="git-panel__btn" onClick={refresh} title="Yenile">
          Yenile
        </button>
      </div>

      {state.loading && <div className="git-panel__loading">Yükleniyor…</div>}
      {state.error !== null && <div className="git-panel__error">{state.error}</div>}

      <div className="git-panel__section">
        <div className="git-panel__title">Değişiklikler ({unstaged.length})</div>
        <div ref={listRef} className="git-panel__list" role="list">
          {unstaged.length === 0 ? (
            <div className="git-panel__empty">Değişiklik yok</div>
          ) : (
            unstaged.map((file, index) => (
              <div
                key={file.path}
                role="listitem"
                className={
                  isGit && selected === index ? 'git-panel__row git-panel__row--active' : 'git-panel__row'
                }
                onClick={() => {
                  gitModel.setSelected(index);
                  focusManager.set('git');
                }}
                onDoubleClick={() => void doStage(file.path)}
              >
                <span className="git-panel__status" data-status={file.status}>
                  {file.status}
                </span>
                <span className="git-panel__path" title={file.path}>
                  {file.path}
                </span>
                <button
                  type="button"
                  className="git-panel__action"
                  aria-label={`Stage: ${file.path}`}
                  onClick={() => void doStage(file.path)}
                >
                  +
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="git-panel__section">
        <div className="git-panel__title">Hazırlanan ({stagedList.length})</div>
        <div className="git-panel__list" role="list">
          {stagedList.length === 0 ? (
            <div className="git-panel__empty">Hazırlanan yok</div>
          ) : (
            stagedList.map((file) => (
              <div key={file.path} role="listitem" className="git-panel__row">
                <span className="git-panel__status" data-status={file.status}>
                  {file.status}
                </span>
                <span className="git-panel__path">{file.path}</span>
                <button
                  type="button"
                  className="git-panel__action"
                  aria-label={`Unstage: ${file.path}`}
                  onClick={() => void doUnstage(file.path)}
                >
                  −
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="git-panel__section">
        <div className="git-panel__title">Log</div>
        <div className="git-panel__log" role="list">
          {state.log.length === 0 ? (
            <div className="git-panel__empty">Log yok</div>
          ) : (
            state.log.slice(0, 8).map((entry) => (
              <div key={entry.hash} role="listitem" className="git-panel__log-row" title={entry.hash}>
                <span className="git-panel__log-hash">{entry.hash.slice(0, 7)}</span>
                <span className="git-panel__log-msg">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="git-panel__commit">
        <textarea
          className="git-panel__input"
          placeholder="Commit mesajı"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
        />
        <div className="git-panel__actions">
          <button type="button" className="git-panel__btn git-panel__btn--primary" onClick={() => void doCommit()}>
            Commit
          </button>
          <button type="button" className="git-panel__btn" onClick={() => void doPush()}>
            Push
          </button>
          <button type="button" className="git-panel__btn" onClick={() => void doPull()}>
            Pull
          </button>
        </div>
      </div>
    </div>
  );
}
