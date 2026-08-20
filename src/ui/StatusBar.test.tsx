import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '../layout/AppShell';

vi.mock('../editor/EditorCore', () => ({
  EditorCore: () => <div data-testid="editor-core-mock" />,
}));

describe('StatusBar', () => {
  it('uygulama kabuğunun altına çizilir', () => {
    render(<AppShell />);
    const bar = screen.getByLabelText('Durum çubuğu');
    expect(bar).toBeInTheDocument();
    expect(bar.className).toContain('status-bar');
  });
});