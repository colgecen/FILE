import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { tabsModel } from '../core/tabs';
import type { OpenFile } from '../core/types';
import { Breadcrumb } from './Breadcrumb';

afterEach(cleanup);

const file = (path: string, name: string): OpenFile => ({
  path,
  name,
  content: 'içerik',
  language: 'typescript',
});

beforeEach(() => {
  tabsModel.reset();
});

describe('Breadcrumb', () => {
  it('sekme yokken karşılama gösterir', () => {
    render(<Breadcrumb />);
    expect(screen.getByText('Karşılama')).not.toBeNull();
  });

  it('aktif dosyanın yol parçalarını gösterir', () => {
    tabsModel.open(file('/proje/src/main.py', 'main.py'));
    render(<Breadcrumb />);
    expect(screen.getByText('main.py')).not.toBeNull();
    expect(screen.getByText('src')).not.toBeNull();
  });

  it('son parçayı aktif işaretler', () => {
    tabsModel.open(file('/proje/src/main.py', 'main.py'));
    render(<Breadcrumb />);
    const active = document.querySelector('.breadcrumb__item--active');
    expect(active?.textContent).toBe('main.py');
  });
});
