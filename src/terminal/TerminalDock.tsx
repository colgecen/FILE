import { useEffect, useRef } from 'react';
import { useEnvironmentsState } from '../core/environments';
import {
  terminalModel,
  useTerminalState,
  type TerminalWorkspace,
} from '../core/terminalModel';
import { viewModeModel } from '../core/viewMode';
import {
  CloseIcon,
  MaximizeIcon,
  RestoreIcon,
  SplitVerticalIcon,
  TrashIcon,
} from '../ui/icons';
import { TerminalView } from './TerminalView';

function envCwd(
  envId: string,
  environments: readonly { readonly id: string; readonly rootPath: string }[],
): string | null {
  const env = environments.find((entry) => entry.id === envId);
  if (env === undefined || env.id.startsWith('browser:')) return null;
  return env.rootPath;
}

function WorkspacePanel({
  envId,
  workspace,
  cwd,
  isActiveEnv,
}: {
  readonly envId: string;
  readonly workspace: TerminalWorkspace;
  readonly cwd: string | null;
  readonly isActiveEnv: boolean;
}): React.JSX.Element {
  const activeId = workspace.activeId;
  const splitId =
    workspace.split && activeId !== null
      ? workspace.splitId ?? workspace.tabs.find((tab) => tab.id !== activeId)?.id ?? null
      : null;
  const fullscreen = workspace.fullscreen;

  const enterFullscreen = (): void => {
    const appFullscreen = viewModeModel.getState().fullscreen;
    terminalModel.setFullscreen(envId, true, appFullscreen);
    if (!appFullscreen) {
      viewModeModel.setFullscreen(true);
      void window.api.setFullscreen(true);
    }
  };

  const exitFullscreen = (): void => {
    const wasAppFullscreen = workspace.appFullscreenBefore;
    terminalModel.setFullscreen(envId, false, wasAppFullscreen);
    if (!wasAppFullscreen && viewModeModel.getState().fullscreen) {
      viewModeModel.setFullscreen(false);
      void window.api.setFullscreen(false);
    }
  };

  const closePanel = (): void => {
    exitFullscreen();
    terminalModel.closePanel(envId);
  };

  return (
    <div className={`terminal-panel${fullscreen ? ' terminal-panel--fullscreen' : ''}`}>
      <div className="terminal-bar" role="toolbar" aria-label="Terminal araç çubuğu">
        <span className="terminal-bar__title">
          {workspace.tabs.find((tab) => tab.id === activeId)?.title ?? 'Terminal'}
        </span>
        <div className="terminal-bar__spacer" />
        <div className="terminal-bar__actions">
          <button
            type="button"
            className="terminal-bar__action"
            title="Yeni terminal"
            aria-label="Yeni terminal"
            onClick={() => terminalModel.addTab(envId, cwd)}
          >
            <span className="terminal-bar__plus" aria-hidden="true">
              +
            </span>
          </button>
          <button
            type="button"
            className={
              workspace.split
                ? 'terminal-bar__action terminal-bar__action--active'
                : 'terminal-bar__action'
            }
            title="Terminali ikiye böl"
            aria-label="Terminali ikiye böl"
            aria-pressed={workspace.split}
            onClick={() => terminalModel.toggleSplit(envId, cwd)}
          >
            <SplitVerticalIcon />
          </button>
          <span className="terminal-bar__divider" aria-hidden="true" />
          {fullscreen ? (
            <>
              <button
                type="button"
                className="terminal-bar__action"
                title="Küçült"
                aria-label="Terminali küçült"
                onClick={exitFullscreen}
              >
                <RestoreIcon />
              </button>
              <button
                type="button"
                className="terminal-bar__action terminal-bar__action--close"
                title="Kapat"
                aria-label="Terminali kapat"
                onClick={closePanel}
              >
                <CloseIcon />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="terminal-bar__action"
              title="Tam ekran"
              aria-label="Terminali tam ekran yap"
              onClick={enterFullscreen}
            >
              <MaximizeIcon />
            </button>
          )}
        </div>
      </div>
      <div className="terminal-body">
        <div className={`terminal-panes${workspace.split ? ' terminal-panes--split' : ''}`}>
          {workspace.tabs.map((tab) => {
            const primary = tab.id === activeId;
            const secondary = splitId !== null && tab.id === splitId;
            const visible = isActiveEnv && workspace.open && (primary || secondary);
            const order = primary ? 0 : secondary ? 1 : 2;
            return (
              <div
                key={tab.id}
                className={
                  secondary
                    ? 'terminal-pane terminal-pane--secondary'
                    : 'terminal-pane'
                }
                style={{ display: visible ? 'flex' : 'none', order }}
                onPointerDown={() => {
                  if (!primary) terminalModel.setActive(envId, tab.id);
                }}
              >
                <TerminalView
                  cwd={tab.cwd}
                  active={isActiveEnv && workspace.open && primary}
                />
              </div>
            );
          })}
        </div>
        {workspace.tabs.length > 1 && (
          <div className="terminal-sidebar" role="tablist" aria-label="Terminal sekmeleri">
            {workspace.tabs.map((tab) => {
              const active = tab.id === activeId && workspace.open;
              return (
                <div
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  tabIndex={0}
                  title={tab.title}
                  className={
                    active
                      ? 'terminal-tab terminal-tab--vertical terminal-tab--active'
                      : 'terminal-tab terminal-tab--vertical'
                  }
                  onClick={() => terminalModel.setActive(envId, tab.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      terminalModel.setActive(envId, tab.id);
                    }
                  }}
                >
                  <span className="terminal-tab__title">{tab.title}</span>
                  <button
                    type="button"
                    className="terminal-tab__trash"
                    title={`${tab.title} terminalini sil`}
                    aria-label={`${tab.title} terminalini sil`}
                    onClick={(event) => {
                      event.stopPropagation();
                      terminalModel.closeTab(envId, tab.id);
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function TerminalDock(): React.JSX.Element | null {
  const terminalState = useTerminalState();
  const { environments, activeId } = useEnvironmentsState();
  const activeEnvId = activeId ?? 'default';
  const activeWorkspace = terminalState.workspaces[activeEnvId];
  const entries = Object.entries(terminalState.workspaces);
  const previousEnvRef = useRef(activeEnvId);

  useEffect(() => {
    const valid = new Set<string>(['default']);
    for (const env of environments) valid.add(env.id);
    terminalModel.prune(valid);
  }, [environments]);

  useEffect(() => {
    const previous = previousEnvRef.current;
    previousEnvRef.current = activeEnvId;
    if (previous === activeEnvId) return;
    const workspace = terminalState.workspaces[previous];
    if (workspace?.fullscreen !== true) return;
    terminalModel.setFullscreen(previous, false, workspace.appFullscreenBefore);
    if (!workspace.appFullscreenBefore && viewModeModel.getState().fullscreen) {
      viewModeModel.setFullscreen(false);
      void window.api.setFullscreen(false);
    }
  }, [activeEnvId, terminalState.workspaces]);

  if (entries.length === 0) return null;

  const visible = activeWorkspace?.open === true;
  const fullscreen = activeWorkspace?.fullscreen === true;
  const className = [
    'terminal-dock',
    visible ? '' : 'terminal-dock--hidden',
    fullscreen ? 'terminal-dock--fullscreen' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      {entries.map(([envId, workspace]) => (
        <div
          key={envId}
          className={
            envId === activeEnvId
              ? 'terminal-workspace'
              : 'terminal-workspace terminal-workspace--hidden'
          }
        >
          <WorkspacePanel
            envId={envId}
            workspace={workspace}
            cwd={envCwd(envId, environments)}
            isActiveEnv={envId === activeEnvId}
          />
        </div>
      ))}
    </div>
  );
}
