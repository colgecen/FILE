import { describe, expect, it } from 'vitest';
import { TerminalLineBuffer } from './lineBuffer';
import { MockShell } from './mockShell';

describe('MockShell', () => {
  const shell = new MockShell();

  it('boş girişi yok sayar', () => {
    expect(shell.run('')).toEqual({ output: [], clear: false });
    expect(shell.run('   ')).toEqual({ output: [], clear: false });
  });

  it('echo komutunu çalıştırır', () => {
    expect(shell.run('echo merhaba dünya')).toEqual({ output: ['merhaba dünya'], clear: false });
  });

  it('clear komutu ekranı temizler', () => {
    expect(shell.run('clear')).toEqual({ output: [], clear: true });
  });

  it('pwd ve whoami yanıtlarını verir', () => {
    expect(shell.run('pwd').output[0]).toBe('/kök');
    expect(shell.run('whoami').output[0]).toBe('misafir');
  });

  it('bilinmeyen komutta uyarı basar', () => {
    expect(shell.run('bilinmeyen').output[0]).toBe('komut bulunamadı: bilinmeyen');
  });

  it('help komutu komut listesini basar', () => {
    expect(shell.run('help').output.join('\n')).toContain('clear');
    expect(shell.run('help').output.join('\n')).toContain('echo');
  });
});

describe('TerminalLineBuffer', () => {
  it('yazdırılabilir karakterleri biriktirir', () => {
    const line = new TerminalLineBuffer();
    expect(line.feed('hel')).toEqual({ echoed: 'hel', submitted: null });
    expect(line.feed('lo')).toEqual({ echoed: 'lo', submitted: null });
  });

  it('enter satırı teslim eder', () => {
    const line = new TerminalLineBuffer();
    line.feed('echo x');
    expect(line.feed('\r')).toEqual({ echoed: '', submitted: 'echo x' });
  });

  it('backspace son karakteri siler ve echo ile geri sarar', () => {
    const line = new TerminalLineBuffer();
    line.feed('ab');
    const result = line.feed('\x7f');
    expect(result).toEqual({ echoed: '\b \b', submitted: null });
    expect(line.feed('\r').submitted).toBe('a');
  });

  it('kontrol karakterlerini yok sayar', () => {
    const line = new TerminalLineBuffer();
    expect(line.feed('\x01\x02')).toEqual({ echoed: '', submitted: null });
  });
});