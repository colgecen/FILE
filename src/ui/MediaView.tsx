import { useEffect, useState } from 'react';
import { mediaKindForPath, mediaUrlForPath } from '../core/media';
import type { OpenFile } from '../core/types';

type Props = { readonly file: OpenFile };

export function MediaView({ file }: Props): React.JSX.Element {
  const kind = file.kind ?? mediaKindForPath(file.path) ?? 'image';
  const url = mediaUrlForPath(file.path);

  if (kind === 'video') {
    return (
      <div className="media-view media-view--video">
        <video className="media-view__video" src={url} controls preload="metadata" />
        <div className="media-view__caption">{file.name}</div>
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="media-view media-view--audio">
        <div className="media-view__audio-card">
          <div className="media-view__audio-icon" aria-hidden="true">♪</div>
          <div className="media-view__audio-name">{file.name}</div>
          <audio className="media-view__audio" src={url} controls preload="metadata" />
        </div>
      </div>
    );
  }

  return <ImageView url={url} name={file.name} />;
}

function ImageView({ url, name }: { readonly url: string; readonly name: string }): React.JSX.Element {
  const [scale, setScale] = useState(1);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [fit, setFit] = useState(true);

  useEffect(() => {
    setScale(1);
    setFit(true);
    setNatural(null);
  }, [url]);

  const zoomIn = (): void => {
    setFit(false);
    setScale((s) => Math.min(8, Math.round((s + 0.25) * 100) / 100));
  };
  const zoomOut = (): void => {
    setFit(false);
    setScale((s) => Math.max(0.1, Math.round((s - 0.25) * 100) / 100));
  };
  const reset = (): void => {
    setFit(true);
    setScale(1);
  };

  const imgStyle: React.CSSProperties = fit
    ? { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }
    : { transform: `scale(${scale})`, transformOrigin: 'center center' };

  return (
    <div className="media-view media-view--image">
      <div className="media-view__toolbar">
        <button type="button" className="media-view__btn" onClick={zoomOut} aria-label="Uzaklaştır">−</button>
        <button type="button" className="media-view__btn" onClick={reset} aria-label="Sığdır">
          {fit ? 'Sığdır' : `${Math.round(scale * 100)}%`}
        </button>
        <button type="button" className="media-view__btn" onClick={zoomIn} aria-label="Yakınlaştır">+</button>
        {natural !== null && (
          <span className="media-view__dims">{natural.w} × {natural.h}</span>
        )}
      </div>
      <div className="media-view__canvas">
        <img
          className="media-view__img"
          src={url}
          alt={name}
          style={imgStyle}
          onLoad={(e) => {
            const img = e.currentTarget;
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}