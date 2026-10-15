import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { ModulesPanel } from './ModulesPanel';

afterEach(cleanup);

describe('ModulesPanel', () => {
  it('dört canlı satır gösterir', () => {
    render(<ModulesPanel />);
    expect(screen.getByText('Modüller')).not.toBeNull();
    expect(screen.getByText('YZ Motoru')).not.toBeNull();
    expect(screen.getByText('Sistem')).not.toBeNull();
    expect(screen.getByText('Terminal')).not.toBeNull();
    expect(screen.getByText('Git')).not.toBeNull();
  });

  it('terminal kapalıyken kapalı yazar', () => {
    render(<ModulesPanel />);
    expect(screen.getByText('[Kapalı]')).not.toBeNull();
  });
});
