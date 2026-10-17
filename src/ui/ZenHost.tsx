import { useEffect, useRef, useState } from 'react';
import type { EmbeddedLayout } from '../../electron/preload/index';
import '../styles/browser.css';

function measure(host: HTMLElement): EmbeddedLayout {
  const rect = host.getBoundingClientRect();
  const scale = window.devicePixelRatio;
  return {
    x: Math.round(rect.x * scale),
    y: Math.round(rect.y * scale),
    width: Math.round(rect.width * scale),
    height: Math.round(rect.height * scale),
  };
}

let pendingHide: number | null = null;

export function ZenHost({ paused = false }: { readonly paused?: boolean }): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'starting' | 'ready' | 'failed'>('starting');

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;
    let disposed = false;
    if (pendingHide !== null) {
      window.clearTimeout(pendingHide);
      pendingHide = null;
    }
    const send = (): void => {
      void window.api.zenLayout(measure(host));
    };
    let retry: number | null = null;
    const tryEmbed = (): void => {
      void window.api.zenEmbed(measure(host)).then((ok: boolean) => {
        if (disposed) return;
        setStatus(ok ? 'ready' : 'failed');
        if (!ok && retry === null) {
          // Basarisiz olursa 5 sn'de bir yeniden dene (bekci pencereyi yakalayabilir).
          retry = window.setTimeout(tryEmbed, 5000);
        }
      });
    };
    tryEmbed();
    let debounce: number | null = null;
    const observer = new ResizeObserver(() => {
      if (debounce !== null) window.clearTimeout(debounce);
      debounce = window.setTimeout(send, 80);
    });
    observer.observe(host);
    window.addEventListener('resize', send);
    return () => {
      disposed = true;
      if (debounce !== null) window.clearTimeout(debounce);
      if (retry !== null) window.clearTimeout(retry);
      observer.disconnect();
      window.removeEventListener('resize', send);
      // Gecikmeli gizle: StrictMode/yeniden eşleştirme anında iptal edilir,
      // böylece pencere gereksiz yere ekran dışına sekip titremez.
      if (pendingHide !== null) window.clearTimeout(pendingHide);
      pendingHide = window.setTimeout(() => {
        pendingHide = null;
        void window.api.zenHide();
      }, 150);
    };
  }, []);

  return (
    <div className="zen-host">
      <div className="zen-host__page" ref={hostRef} />
      {paused && (
        <div className="zen-host__paused" role="status">
          Menü açık — tarayıcı menü kapanınca geri gelir
        </div>
      )}
      {status !== 'ready' && !paused && (
        <div className="zen-host__status" role="status">
          {status === 'starting' ? 'Zen başlatılıyor…' : 'Zen gömülemedi — dışarıdan açık bir Zen (Wayland) varsa kapatıp yeniden dene'}
        </div>
      )}
    </div>
  );
}