// @vitest-environment node
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPtyManager } from './manager';

type FakeChild = EventEmitter & {
  stdin: {
    write: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  };
  stdout: EventEmitter;
};

function fakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdin = { write: vi.fn(), end: vi.fn(), on: vi.fn() };
  child.stdout = new EventEmitter();
  return child;
}

function feedLines(child: FakeChild, lines: readonly string[]): void {
  for (const line of lines) {
    child.stdout.emit('data', Buffer.from(`${line}\n`));
  }
}

describe('PtyManager', () => {
  let child: FakeChild;
  let spawnFn: ReturnType<typeof vi.fn>;
  const dataSpy = vi.fn();
  const exitSpy = vi.fn();

  beforeEach(() => {
    child = fakeChild();
    spawnFn = vi.fn().mockReturnValue(child);
    dataSpy.mockClear();
    exitSpy.mockClear();
    process.env['PTY_NODE_BIN'] = '/usr/bin/env';
  });

  const create = (): ReturnType<typeof createPtyManager> => {
    const pty = createPtyManager(spawnFn, '/tmp/helper.js');
    pty.onData = dataSpy;
    pty.onExit = exitSpy;
    return pty;
  };

  it('start helper sürecini spawn eder ve ready hazırlığını yapar', () => {
    const pty = create();
    pty.start();
    expect(spawnFn).toHaveBeenCalledWith('/usr/bin/env', ['/tmp/helper.js'], expect.objectContaining({}));
    expect(child.stdin.write).not.toHaveBeenCalled();
  });

  it('spawnSession spawn mesajı gönderir ve id döner', () => {
    const pty = create();
    pty.start();
    const id = pty.spawnSession({ cols: 80, rows: 24 });
    expect(id).toMatch(/^pty-/);
    expect(child.stdin.write).toHaveBeenCalledWith(
      `${JSON.stringify({ type: 'spawn', id, cols: 80, rows: 24 })}\n`,
    );
  });

  it('helper data olayını onData ile yansıtır', () => {
    const pty = create();
    pty.start();
    const id = pty.spawnSession({ cols: 80, rows: 24 });
    feedLines(child, [
      '{"type":"ready"}',
      JSON.stringify({ type: 'data', id, data: 'selam\r\n' }),
      JSON.stringify({ type: 'data', id, data: '# ' }),
    ]);
    expect(dataSpy).toHaveBeenCalledTimes(2);
    expect(dataSpy).toHaveBeenNthCalledWith(1, id, 'selam\r\n');
    expect(dataSpy).toHaveBeenNthCalledWith(2, id, '# ');
  });

  it('helper exit olayında oturumu temizler ve onExit çağırır', () => {
    const pty = create();
    pty.start();
    const id = pty.spawnSession({ cols: 80, rows: 24 });
    feedLines(child, [`{"type":"exit","id":"${id}","exitCode":0}`]);
    expect(exitSpy).toHaveBeenCalledWith(id, 0);
    pty.write(id, 'x');
    expect(child.stdin.write).toHaveBeenCalledTimes(1);
  });

  it('write/resize/kill mesaj kuyruğunu doğru üretir', () => {
    const pty = create();
    pty.start();
    const id = pty.spawnSession({ cols: 80, rows: 24 });
    child.stdin.write.mockClear();
    pty.write(id, 'ls\r');
    pty.resize(id, 100, 40);
    pty.kill(id);
    const calls = child.stdin.write.mock.calls.map((call) => call[0]);
    expect(calls).toEqual([
      `{"type":"write","id":"${id}","data":"ls\\r"}\n`,
      `{"type":"resize","id":"${id}","cols":100,"rows":40}\n`,
      `{"type":"kill","id":"${id}"}\n`,
    ]);
  });

  it('bilinmeyen oturuma yazma gönderilmez', () => {
    const pty = create();
    pty.start();
    pty.write('yok', 'x');
    expect(child.stdin.write).not.toHaveBeenCalled();
  });

  it('killAll ve dispose tüm oturumları sonlandırır', () => {
    const pty = create();
    pty.start();
    const a = pty.spawnSession({ cols: 80, rows: 24 });
    const b = pty.spawnSession({ cols: 80, rows: 24 });
    child.stdin.write.mockClear();
    pty.dispose();
    const calls = child.stdin.write.mock.calls.map((call) => call[0]);
    expect(calls).toEqual([
      `{"type":"kill","id":"${a}"}\n`,
      `{"type":"kill","id":"${b}"}\n`,
    ]);
    expect(child.stdin.end).toHaveBeenCalled();
  });

  it('helper çıkışında süreç null olur; yeni start yeniden spawn eder', () => {
    const pty = create();
    pty.start();
    child.emit('exit');
    pty.spawnSession({ cols: 80, rows: 24 });
    expect(spawnFn).toHaveBeenCalledTimes(1);
  });

  it('bozuk satırlar yoksayılır', () => {
    const pty = create();
    pty.start();
    feedLines(child, ['not-json', '', '   ']);
    expect(dataSpy).not.toHaveBeenCalled();
  });
});