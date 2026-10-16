import { useEffect, useRef } from 'react';
import { usePerfState } from '../core/perfModel';

const BARS = 48;

export function Waveform({ active }: { readonly active: boolean }): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perf = usePerfState();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext('2d');
    if (context === null) return;

    const reduced =
      perf.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.max(1, Math.floor(height * ratio));
    context.scale(ratio, ratio);

    if (!active || reduced) {
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(10, 132, 255, 0.4)';
      context.fillRect(0, Math.floor(height / 2), width, 1);
      return;
    }

    let frame = 0;
    const draw = (): void => {
      frame += 1;
      context.clearRect(0, 0, width, height);
      const gap = width / BARS;
      for (let i = 0; i < BARS; i += 1) {
        const wave = Math.abs(Math.sin(i * 0.55 + frame * 0.12) * Math.cos(i * 0.21 - frame * 0.07));
        const barHeight = Math.max(2, wave * (height - 6));
        const x = i * gap + gap * 0.25;
        const y = (height - barHeight) / 2;
        const center = Math.abs(i - BARS / 2) / (BARS / 2);
        const alpha = 0.35 + (1 - center) * 0.55;
        context.fillStyle = `rgba(10, 132, 255, ${alpha.toFixed(2)})`;
        context.fillRect(x, y, Math.max(1, gap * 0.5), barHeight);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, perf.reducedMotion]);

  return <canvas ref={canvasRef} className="ai-chat__wave" aria-hidden="true" />;
}
