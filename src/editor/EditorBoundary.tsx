import { Component, type ReactNode } from 'react';

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly error: Error | null;
}

export class EditorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidMount(): void {
    if (this.state.error !== null) {
      console.error('[EditorBoundary] editor crashed at startup, resetting monaco cache');
    }
  }

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <div className="editor-boundary" data-testid="editor-boundary">
        <p>Editör başlatılamadı.</p>
        <pre>{this.state.error.message}</pre>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
          }}
        >
          Tekrar dene
        </button>
      </div>
    );
  }
}
