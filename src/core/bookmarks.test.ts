import { beforeEach, describe, expect, it } from 'vitest';
import { BookmarkModel } from './bookmarks';

const pathA = '/proje/src/a.ts';
const pathB = '/proje/src/b.ts';

describe('BookmarkModel', () => {
  let model: BookmarkModel;

  beforeEach(() => {
    model = new BookmarkModel();
  });

  it('yeni yer imi ekler', () => {
    model.toggle(pathA, 3, 1);
    expect(model.list()).toEqual([{ path: pathA, line: 3, column: 1 }]);
  });

  it('aynı satıra yer imi varsa kaldırır', () => {
    model.toggle(pathA, 3, 1);
    model.toggle(pathA, 3, 5);
    expect(model.list()).toEqual([]);
  });

  it('has sorgusu doğru yanıt verir', () => {
    model.toggle(pathA, 3, 1);
    expect(model.has(pathA, 3)).toBe(true);
    expect(model.has(pathA, 4)).toBe(false);
    expect(model.has(pathB, 3)).toBe(false);
  });

  it('sonraki yer imini aynı dosyada satır sırasıyla bulur', () => {
    model.toggle(pathA, 5, 1);
    model.toggle(pathA, 2, 1);
    expect(model.nextFrom(pathA, 1)).toEqual({ path: pathA, line: 2, column: 1 });
    expect(model.nextFrom(pathA, 2)).toEqual({ path: pathA, line: 5, column: 1 });
  });

  it('sonraki yoksa dosyanın ilk yer imine döner', () => {
    model.toggle(pathA, 5, 1);
    model.toggle(pathA, 2, 1);
    expect(model.nextFrom(pathA, 5)).toEqual({ path: pathA, line: 2, column: 1 });
  });

  it('dosyada yer imi yoksa başka dosyadan ilk yer imini kullanır', () => {
    model.toggle(pathA, 2, 1);
    model.toggle(pathB, 7, 3);
    expect(model.nextFrom(pathB, 7)).toEqual({ path: pathB, line: 7, column: 3 });
    expect(model.nextFrom('/yok/dosya.ts', 1)).toEqual({ path: pathA, line: 2, column: 1 });
  });

  it('abone olunan değişiklikleri duyurur', () => {
    const events: number[] = [];
    model.subscribe(() => events.push(model.list().length));
    model.toggle(pathA, 3, 1);
    model.toggle(pathA, 3, 1);
    expect(events).toEqual([1, 0]);
  });
});