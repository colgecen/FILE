import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from '../layout/AppShell';
import { explorerModel } from '../core/explorer';

describe('ExplorerView', () => {
  afterEach(() => {
    act(() => {
      explorerModel.close();
    });
  });

  it('kapalıyken gezgin görünmez', () => {
    render(<AppShell />);
    expect(screen.queryByRole('region', { name: 'Dosya gezgini' })).toBeNull();
  });

  it('açıkken sol panel başlığıyla görünür', () => {
    render(<AppShell />);
    act(() => {
      explorerModel.open();
    });
    const pane = screen.getByRole('region', { name: 'Dosya gezgini' });
    expect(pane).toBeInTheDocument();
    expect(pane).toHaveClass('explorer-view');
    expect(screen.getByText('GEZGİN')).toBeInTheDocument();
  });
});