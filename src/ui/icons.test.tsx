import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { FileLogo, FolderIcon } from './icons';

afterEach(cleanup);

describe('FileLogo', () => {
  it.each([
    ['a.ts', 'ts'],
    ['a.js', 'js'],
    ['a.py', 'py'],
    ['a.json', 'json'],
    ['a.css', 'css'],
    ['a.html', 'html'],
    ['a.md', 'md'],
  ])('%s için logo çizer', (name, logo) => {
    const { container } = render(<FileLogo name={name} />);
    expect(container.querySelector(`[data-logo="${logo}"]`)).not.toBeNull();
  });

  it('bilinmeyen uzantıda genel dosya ikonu çizer', () => {
    const { container } = render(<FileLogo name={'arsiv.xyz'} />);
    expect(container.querySelector('[data-logo="xyz"]')).not.toBeNull();
  });
});

describe('FolderIcon', () => {
  it('açık ve kapalı varyant çizer', () => {
    const closed = render(<FolderIcon open={false} />);
    expect(closed.container.querySelector('svg')).not.toBeNull();
    const open = render(<FolderIcon open={true} />);
    expect(open.container.querySelector('svg')).not.toBeNull();
  });
});
