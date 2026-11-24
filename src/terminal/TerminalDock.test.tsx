import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { environmentsModel } from '../core/environments';
import { terminalModel } from '../core/terminalModel';
import { TerminalDock } from './TerminalDock';

vi.mock('./TerminalView', () => ({
  TerminalView: () => <div data-testid="terminal-view" />,
}));

beforeEach(() => {
  environmentsModel.reset();
  terminalModel.reset();
});

describe('TerminalDock', () => {
  it('tam ekranın yanında kapat düğmesi gösterir ve paneli kapatır', () => {
    terminalModel.addTab('default', null);
    render(<TerminalDock />);
    expect(screen.getByRole('button', { name: 'Terminali tam ekran yap' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Terminali kapat' }));
    expect(document.querySelector('.terminal-dock')?.className).toContain('terminal-dock--hidden');
  });
});
