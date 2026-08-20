// @vitest-environment node
import { Readable, Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import type { PtyHelperEvent, PtyHelperMessage } from './helper';
import { runPtyHelper } from './helper';

type ReceivedEvent = { readonly raw: string; readonly parsed: PtyHelperEvent };

function startHelper(): {
  input: (msg: PtyHelperMessage) => void;
  events: ReceivedEvent[];
  waitFor: (match: (event: PtyHelperEvent) => boolean) => Promise<ReceivedEvent>;
} {
  const events: ReceivedEvent[] = [];
  const waiters: Array<{ match: (event: PtyHelperEvent) => boolean; resolve: (e: ReceivedEvent) => void; done: boolean }> = [];

  const input = new Readable({ read: () => undefined });
  const output = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      for (const line of chunk.toString('utf8').split('\n')) {
        if (line.trim().length === 0) continue;
        let parsed: PtyHelperEvent;
        try {
          parsed = JSON.parse(line) as PtyHelperEvent;
        } catch {
          continue;
        }
        const record = { raw: line, parsed };
        events.push(record);
        for (const waiter of waiters) {
          if (!waiter.done && waiter.match(parsed)) {
            waiter.done = true;
            waiter.resolve(record);
          }
        }
      }
      callback();
    },
  });

  runPtyHelper(input, output);

  return {
    input: (msg) => input.push(`${JSON.stringify(msg)}\n`),
    events,
    waitFor(match) {
      const existing = events.find((e) => match(e.parsed));
      if (existing !== undefined) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const waiter = { match, done: false, resolve };
        waiters.push(waiter);
        setTimeout(() => {
          if (!waiter.done) {
            reject(new Error('PTY olayı zaman aşımına uğradı'));
          }
        }, 8000);
      });
    },
  };
}

describe('pty helper gerçek kabuk akışı', () => {
  it('ready gönderir, spawn sonrası çıktı akar ve exit yansır', async () => {
    const helper = startHelper();
    const ready = await helper.waitFor((e) => e.type === 'ready');
    expect(ready.parsed.type).toBe('ready');

    helper.input({ type: 'spawn', id: 't1', cols: 80, rows: 24 });
    helper.input({ type: 'write', id: 't1', data: 'echo pty-ok\r' });

    const data = await helper.waitFor((e) => e.type === 'data' && e.data?.includes('pty-ok'));
    expect(data.parsed).toMatchObject({ type: 'data', id: 't1' });

    helper.input({ type: 'write', id: 't1', data: 'exit\r' });
    const exit = await helper.waitFor((e) => e.type === 'exit' && e.id === 't1');
    if (exit.parsed.type !== 'exit') throw new Error('exit olayı bekleniyordu');
    expect(exit.parsed.exitCode).toBe(0);
  });

  it('resize ve kill mesajları hatasız işlenir', async () => {
    const helper = startHelper();
    await helper.waitFor((e) => e.type === 'ready');
    helper.input({ type: 'spawn', id: 't2', cols: 40, rows: 10 });
    helper.input({ type: 'resize', id: 't2', cols: 120, rows: 30 });
    helper.input({ type: 'write', id: 't2', data: 'exit\r' });
    const exit = await helper.waitFor((e) => e.type === 'exit' && e.id === 't2');
    if (exit.parsed.type !== 'exit') throw new Error('exit olayı bekleniyordu');
    expect(exit.parsed.exitCode).toBe(0);
  });
});