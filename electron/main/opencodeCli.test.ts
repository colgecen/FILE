// @vitest-environment node
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  cliErrorLine,
  extractOpencodeModels,
  parseRunEvent,
  startOpencodeCliChat,
  type CliChild,
} from './opencodeCli';

function fakeChild(): {
  child: CliChild;
  stdout: PassThrough;
  stderr: PassThrough;
  emitter: EventEmitter;
  kill: ReturnType<typeof vi.fn>;
} {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const emitter = new EventEmitter();
  const kill = vi.fn();
  const child: CliChild = {
    stdout,
    stderr,
    on: (event, listener) => emitter.on(event, listener),
    kill,
  };
  return { child, stdout, stderr, emitter, kill };
}

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

const ARGS = { requestId: 'req-1', model: 'big-pickle', prompt: 'selam', sessionId: null };

describe('parseRunEvent', () => {
  it('text olayını parça kimliğiyle çıkarır', () => {
    const line = JSON.stringify({
      type: 'text',
      sessionID: 'ses-1',
      part: { id: 'prt-1', type: 'text', text: 'Merhaba' },
    });
    expect(parseRunEvent(line)).toEqual({ kind: 'text', partId: 'prt-1', text: 'Merhaba' });
  });

  it('sessionID taşıyan diğer olayları oturum bilgisi sayar', () => {
    const line = JSON.stringify({ type: 'step_start', sessionID: 'ses-1', part: {} });
    expect(parseRunEvent(line)).toEqual({ kind: 'session', sessionId: 'ses-1' });
  });

  it('bozuk satır invalid döner', () => {
    expect(parseRunEvent('{')).toEqual({ kind: 'invalid' });
  });

  it('oturumsuz bilinmeyen olay other döner', () => {
    expect(parseRunEvent(JSON.stringify({ type: 'step_finish' }))).toEqual({ kind: 'other' });
  });
});

describe('extractOpencodeModels', () => {
  it('yalnız opencode modellerini sıralı ve tekil döndürür', () => {
    const output = ['openrouter/gpt-5', 'opencode/big-pickle', 'opencode/cat-jam-free', 'opencode/big-pickle'].join('\n');
    expect(extractOpencodeModels(output)).toEqual(['big-pickle', 'cat-jam-free']);
  });

  it('model yoksa boş liste döner', () => {
    expect(extractOpencodeModels('openrouter/gpt-5\n')).toEqual([]);
  });
});

describe('cliErrorLine', () => {
  it('ANSI kodlarını temizleyip son satırı alır', () => {
    const stderr = '\u001b[31mhata satırı\u001b[0m\n\u001b[90mFreeTierError: kullanım yok\u001b[0m\n';
    expect(cliErrorLine(stderr)).toBe('FreeTierError: kullanım yok');
  });
});

describe('startOpencodeCliChat', () => {
  it('metni kümülatif akıtır, oturumu iletir ve bitişte tam metni verir', async () => {
    const fake = fakeChild();
    const tokens: string[] = [];
    const sessions: string[] = [];
    const done = new Promise<string>((resolve) => {
      startOpencodeCliChat(
        ARGS,
        {
          onSession: (id) => sessions.push(id),
          onToken: (text) => tokens.push(text),
          onDone: (text) => resolve(text),
          onError: () => resolve('hata'),
        },
        { bin: '/bin/opencode', spawnFn: () => fake.child },
      );
    });
    fake.stdout.write(`${JSON.stringify({ type: 'step_start', sessionID: 'ses-9' })}\n`);
    fake.stdout.write(
      `${JSON.stringify({ type: 'text', sessionID: 'ses-9', part: { id: 'prt-1', text: 'Me' } })}\n`,
    );
    fake.stdout.write(
      `${JSON.stringify({ type: 'text', sessionID: 'ses-9', part: { id: 'prt-1', text: 'Merhaba' } })}\n`,
    );
    fake.stdout.write(
      `${JSON.stringify({ type: 'text', sessionID: 'ses-9', part: { id: 'prt-2', text: ' dünya' } })}\n`,
    );
    fake.stdout.end();
    await tick();
    fake.emitter.emit('close', 0);
    await expect(done).resolves.toBe('Merhaba dünya');
    expect(tokens).toEqual(['Me', 'Merhaba', 'Merhaba dünya']);
    expect(sessions).toEqual(['ses-9']);
  });

  it('model ön ekini ve oturum kimliğini argümanlara koyar', () => {
    const fake = fakeChild();
    const spawnFn = vi.fn(() => fake.child);
    startOpencodeCliChat(
      { ...ARGS, sessionId: 'ses-9' },
      { onSession: () => undefined, onToken: () => undefined, onDone: () => undefined, onError: () => undefined },
      { bin: '/bin/opencode', spawnFn, cwd: '/tmp' },
    );
    expect(spawnFn).toHaveBeenCalledWith(
      '/bin/opencode',
      ['run', '--format', 'json', '-m', 'opencode/big-pickle', '-s', 'ses-9', 'selam'],
      { cwd: '/tmp' },
    );
  });

  it('sıfırdan farklı çıkışta son stderr satırını hata olarak verir', async () => {
    const fake = fakeChild();
    const failed = new Promise<string>((resolve) => {
      startOpencodeCliChat(
        ARGS,
        {
          onSession: () => undefined,
          onToken: () => undefined,
          onDone: () => resolve('bitti'),
          onError: (message) => resolve(message),
        },
        { bin: '/bin/opencode', spawnFn: () => fake.child },
      );
    });
    fake.stderr.write('\u001b[31mFreeTierError: kullanım yok\u001b[0m\n');
    fake.stderr.end();
    await tick();
    fake.emitter.emit('close', 1);
    await expect(failed).resolves.toBe('FreeTierError: kullanım yok');
  });

  it('iptalde süreç öldürülür ve olaylar yoksayılır', async () => {
    const fake = fakeChild();
    const seen: string[] = [];
    const abort = startOpencodeCliChat(
      ARGS,
      {
        onSession: () => seen.push('oturum'),
        onToken: () => seen.push('token'),
        onDone: () => seen.push('bitti'),
        onError: () => seen.push('hata'),
      },
      { bin: '/bin/opencode', spawnFn: () => fake.child },
    );
    abort();
    expect(fake.kill).toHaveBeenCalledWith('SIGTERM');
    fake.stdout.write(`${JSON.stringify({ type: 'text', sessionID: 's', part: { id: 'p', text: 'geç' } })}\n`);
    fake.stdout.end();
    await tick();
    fake.emitter.emit('close', 0);
    await tick();
    expect(seen).toEqual([]);
  });

  it('binary yoksa hata verir', () => {
    const onError = vi.fn();
    startOpencodeCliChat(
      ARGS,
      { onSession: () => undefined, onToken: () => undefined, onDone: () => undefined, onError },
      { bin: null },
    );
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('opencode CLI'));
  });
});
