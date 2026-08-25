import { useEffect, useState } from 'react';
import { useClockVisible } from '../core/clock';

function formatTrTime(date: Date): string {
  return date.toLocaleTimeString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function Clock(): React.JSX.Element | null {
  const visible = useClockVisible();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <span className="menubar__clock" data-testid="menubar-clock" aria-label="Saat">
      {formatTrTime(now)}
    </span>
  );
}
