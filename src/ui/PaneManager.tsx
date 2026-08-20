import type { OpenFile, PaneLayout } from '../core/types';
import { useErrorFlash } from '../core/errorFlash';
import { usePanes } from '../core/panes';
import { EditorCore } from '../editor/EditorCore';

function PaneNode({
  layout,
  activePaneId,
  file,
}: {
  readonly layout: PaneLayout;
  readonly activePaneId: string;
  readonly file: OpenFile | null;
}): React.JSX.Element {
  if (layout.children === undefined) {
    const isActive = layout.id === activePaneId;
    return (
      <div className={isActive ? 'pane pane--active' : 'pane'}>
        <EditorCore file={file} />
      </div>
    );
  }
  const splitClass =
    layout.direction === 'vertical' ? 'pane-split--vertical' : 'pane-split--horizontal';
  return (
    <div className={`pane-split ${splitClass}`}>
      {layout.children.map((child) => (
        <PaneNode key={child.id} layout={child} activePaneId={activePaneId} file={file} />
      ))}
    </div>
  );
}

export function PaneManager({ file }: { readonly file: OpenFile | null }): React.JSX.Element {
  const { layout, activePaneId } = usePanes();
  const errorFlash = useErrorFlash();
  const className = errorFlash ? 'pane-manager pane-manager--error' : 'pane-manager';
  return (
    <div className={className} data-testid="pane-manager">
      <PaneNode layout={layout} activePaneId={activePaneId} file={file} />
    </div>
  );
}