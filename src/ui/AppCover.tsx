import { useEffect, useState } from 'react';
import { WindowControls } from './WindowControls';

const COVER_MS = 180;
const FADE_MS = 240;

export function AppCover({ duration = COVER_MS }: { duration?: number }): JSX.Element | null {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show');
  useEffect(() => {
    let cancelled = false;
    let fadeTimer = 0;
    let goneTimer = 0;
    const begin = (): void => {
      if (cancelled) return;
      fadeTimer = window.setTimeout(() => {
        if (cancelled) return;
        setPhase('fade');
        goneTimer = window.setTimeout(() => {
          if (!cancelled) setPhase('gone');
        }, FADE_MS);
      }, duration);
    };
    // Fontlar değişirken arayüzün bir kare kaymasını engelle: önce fontlar,
    // sonra kısa bir marka gösterimi ve yumuşak geçiş.
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (fonts !== undefined) {
      void fonts.ready.then(begin, begin);
    } else {
      begin();
    }
    return () => {
      cancelled = true;
      window.clearTimeout(fadeTimer);
      window.clearTimeout(goneTimer);
    };
  }, [duration]);
  if (phase === 'gone') return null;
  return (
    <div className={phase === 'fade' ? 'app-cover app-cover--fade' : 'app-cover'} data-testid="app-cover">
      <div className="app-cover__titlebar">
        <WindowControls />
      </div>
      <img className="app-cover__logo" src="./FILE-app.png" alt="FILE" draggable={false} />
      <div className="app-cover__tag">Tek pencere. Tum ortamlar.</div>
    </div>
  );
}
