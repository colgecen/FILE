import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { MediaView } from './MediaView';
import type { OpenFile } from '../core/types';

afterEach(cleanup);

function file(path: string, kind?: OpenFile['kind']): OpenFile {
  return { path, name: path.split('/').pop() ?? path, content: '', language: 'plaintext', kind };
}

describe('MediaView', () => {
  it('görsel için img render eder', () => {
    const { container } = render(<MediaView file={file('/x/a.png', 'image')} />);
    expect(container.querySelector('img.media-view__img')).not.toBeNull();
    expect(screen.getByAltText('a.png')).toBeInTheDocument();
  });

  it('video için video elementi render eder', () => {
    const { container } = render(<MediaView file={file('/x/a.mp4', 'video')} />);
    expect(container.querySelector('video.media-view__video')).not.toBeNull();
  });

  it('ses için audio elementi render eder', () => {
    const { container } = render(<MediaView file={file('/x/a.mp3', 'audio')} />);
    expect(container.querySelector('audio.media-view__audio')).not.toBeNull();
  });

  it('src file-media şemasını kullanır', () => {
    const { container } = render(<MediaView file={file('/x/a.png', 'image')} />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.src).toContain('file-media://');
    expect(img.src).toContain(encodeURIComponent('/x/a.png'));
  });

  it('kind yoksa uzantıdan çıkarır', () => {
    const { container } = render(<MediaView file={file('/x/a.webm')} />);
    expect(container.querySelector('video')).not.toBeNull();
  });
});