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

export function ZenHost(): React.JSX.Element {
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
    void window.api.zenEmbed(measure(host)).then((ok: boolean) => {
      if (disposed) return;
      setStatus(ok ? 'ready' : 'failed');
    });
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
      {status !== 'ready' && (
        <div className="zen-host__status" role="status">
          {status === 'starting' ? 'Zen başlatılıyor…' : 'Zen gömülemedi — dışarıdan açık bir Zen (Wayland) varsa kapatıp yeniden dene'}
        </div>
      )}
    </div>
  );
}