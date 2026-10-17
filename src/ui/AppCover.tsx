import { useEffect, useState } from 'react';

const COVER_MS = 1400;
const FADE_MS = 600;

export function AppCover({ duration = COVER_MS }: { duration?: number }): JSX.Element | null {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show');
  useEffect(() => {
    const fade = setTimeout(() => setPhase('fade'), duration);
    const gone = setTimeout(() => setPhase('gone'), duration + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, [duration]);
  if (phase === 'gone') return null;
  return (
    <div className={phase === 'fade' ? 'app-cover app-cover--fade' : 'app-cover'} data-testid="app-cover">
      <img className="app-cover__logo" src="./FILE.png" alt="FILE" draggable={false} />
      <div className="app-cover__tag">Tek pencere. Tum ortamlar.</div>
    </div>
  );
}
