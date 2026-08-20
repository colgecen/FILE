import { beforeEach, describe, expect, it } from 'vitest';
import type { PaneLayout } from './types';
import { PanesModel, newPaneId } from './panes';

function leafCount(layout: PaneLayout): number {
  if (layout.children === undefined) return 1;
  return layout.children.reduce((total, child) => total + leafCount(child), 0);
}

describe('PanesModel', () => {
  let model: PanesModel;

  beforeEach(() => {
    model = new PanesModel();
  });

  it('başlangıçta tek pane yaprağından oluşur', () => {
    expect(leafCount(model.getState().layout)).toBe(1);
  });

  it('dikey bölme yeni sağ pane oluşturur ve aktif yapar', () => {
    const first = model.getState().activePaneId;
    model.split('vertical');
    const state = model.getState();
    expect(leafCount(state.layout)).toBe(2);
    expect(state.layout.direction).toBe('vertical');
    expect(state.activePaneId).not.toBe(first);
    expect(state.layout.children).toBeDefined();
  });

  it('yatay bölme yeni alt pane oluşturur', () => {
    model.split('horizontal');
    expect(leafCount(model.getState().layout)).toBe(2);
    expect(model.getState().layout.direction).toBe('horizontal');
  });

  it('zaten bölünmüş pane tekrar bölünmez; yeni pane bölünür', () => {
    model.split('vertical');
    const second = model.getState().activePaneId;
    model.split('vertical');
    expect(leafCount(model.getState().layout)).toBe(3);
    const childIds = (model.getState().layout.children ?? []).map((child) => child.id);
    expect(childIds).toContain(second);
  });

  it('pane kapatmak tek yaprağa döner', () => {
    model.split('vertical');
    model.split('vertical');
    expect(leafCount(model.getState().layout)).toBe(3);
    const firstLeaf = model.getState().activePaneId;
    model.close(firstLeaf);
    expect(leafCount(model.getState().layout)).toBe(2);
  });

  it('son pane kapatılamaz', () => {
    const id = model.getState().activePaneId;
    model.close(id);
    expect(leafCount(model.getState().layout)).toBe(1);
    expect(model.getState().activePaneId).toBe(id);
  });

  it('aktif pane kapatılınca ilk yaprağa geçer', () => {
    model.split('vertical');
    const closed = model.getState().activePaneId;
    model.close(closed);
    const state = model.getState();
    expect(leafCount(state.layout)).toBe(1);
    expect(state.activePaneId).not.toBe(closed);
  });

  it('next paneli sıradaki yaprağa taşır', () => {
    const first = model.getState().activePaneId;
    model.split('vertical');
    const second = model.getState().activePaneId;
    model.next();
    expect(model.getState().activePaneId).toBe(first);
    model.next();
    expect(model.getState().activePaneId).toBe(second);
  });

  it('setActive yalnızca var olan pane yaprağını etkinleştirir', () => {
    const first = model.getState().activePaneId;
    model.setActive('pane-yok');
    expect(model.getState().activePaneId).toBe(first);
  });

  it('newPaneId ardışık benzersiz kimlik üretir', () => {
    expect(newPaneId()).not.toBe(newPaneId());
  });
});