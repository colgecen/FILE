import { describe, expect, it } from 'vitest';
import { decodeMediaPath, encodeMediaPath, mediaKindForPath, mimeForPath } from './mediaKinds';

describe('mediaKinds', () => {
  it('görsel uzantıları image döner', () => {
    expect(mediaKindForPath('/a.png')).toBe('image');
    expect(mediaKindForPath('/a.SVG')).toBe('image');
    expect(mediaKindForPath('/a.gif')).toBe('image');
  });

  it('video uzantıları video döner', () => {
    expect(mediaKindForPath('/a.mp4')).toBe('video');
    expect(mediaKindForPath('/a.webm')).toBe('video');
  });

  it('ses uzantıları audio döner', () => {
    expect(mediaKindForPath('/a.mp3')).toBe('audio');
    expect(mediaKindForPath('/a.wav')).toBe('audio');
  });

  it('metin dosyaları null döner', () => {
    expect(mediaKindForPath('/a.ts')).toBeNull();
    expect(mediaKindForPath('/a.txt')).toBeNull();
    expect(mediaKindForPath('noext')).toBeNull();
  });

  it('mime doğru', () => {
    expect(mimeForPath('/a.png')).toBe('image/png');
    expect(mimeForPath('/a.mp4')).toBe('video/mp4');
    expect(mimeForPath('/a.mp3')).toBe('audio/mpeg');
  });

  it('encode/decode roundtrip', () => {
    const p = '/home/user/My Folder/a b.png';
    expect(decodeMediaPath(encodeMediaPath(p))).toBe(p);
  });
});