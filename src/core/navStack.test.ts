import { beforeEach, describe, expect, it } from 'vitest';
import { NavStackModel } from './navStack';

const a = { path: '/a.ts', line: 1, column: 1 };
const b = { path: '/b.ts', line: 5, column: 2 };
const c = { path: '/c.ts', line: 9, column: 3 };

describe('NavStackModel', () => {
  let stack: NavStackModel;

  beforeEach(() => {
    stack = new NavStackModel();
  });

  it('geri adımı saklanan seriyi geriye doğru yürütür', () => {
    stack.recordBack(a);
    stack.recordBack(b);
    stack.recordBack(c);
    expect(stack.stepBack()).toEqual(c);
    expect(stack.stepBack()).toEqual(b);
    expect(stack.stepBack()).toEqual(a);
    expect(stack.stepBack()).toBeNull();
  });

  it('geri sonrası ileri adımı sırayı ilerletir', () => {
    stack.recordBack(a);
    stack.recordBack(b);
    expect(stack.stepBack()).toEqual(b);
    expect(stack.stepForward()).toEqual(b);
    expect(stack.stepForward()).toBeNull();
  });

  it('yeni kayıt ileri yığınını temizler', () => {
    stack.recordBack(a);
    stack.recordBack(b);
    stack.stepBack();
    stack.stepForward();
    expect(stack.stepForward()).toBeNull();
    stack.recordBack(c);
    expect(stack.stepForward()).toBeNull();
    expect(stack.stepBack()).toEqual(c);
  });

  it('boş yığında adım hata vermez', () => {
    expect(stack.stepBack()).toBeNull();
    expect(stack.stepForward()).toBeNull();
  });

  it('değişiklikleri abonelerine duyurur', () => {
    let count = 0;
    stack.subscribe(() => {
      count += 1;
    });
    stack.recordBack(a);
    stack.stepBack();
    stack.stepForward();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});