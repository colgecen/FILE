import { useEffect, useRef, useState } from 'react';

export function ReticleCursor(): React.JSX.Element {
  const reticleRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const [lockLabel, setLockLabel] = useState<string | null>(null);

  useEffect(() => {
    const reticle = reticleRef.current;
    const tag = tagRef.current;
    if (reticle === null || tag === null) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;
    let currentLock: Element | null = null;

    const onMouseMove = (event: MouseEvent): void => {
      mx = event.clientX;
      my = event.clientY;
    };
    document.addEventListener('mousemove', onMouseMove);

    const update = (): void => {
      try {
        let elements: Element[] = [];
        try {
          if (typeof document.elementsFromPoint === 'function') {
            elements = document.elementsFromPoint(mx, my) as Element[];
          }
        } catch {
          elements = [];
        }
        let target: Element | null = null;
        for (const element of elements) {
          try {
            if (element.hasAttribute('data-lock')) {
              target = element;
              break;
            }
            if (
              element instanceof HTMLElement &&
              (element.tagName === 'BUTTON' ||
                element.tagName === 'A' ||
                element.tagName === 'INPUT' ||
                element.getAttribute('role') === 'tab' ||
                element.classList.contains('tab-bar__item') ||
                element.classList.contains('menu-panel__item'))
            ) {
              target = element;
              break;
            }
          } catch {
            continue;
          }
        }

      if (target !== null && target !== currentLock) {
        currentLock?.classList.remove('reticle-lock--active');
        currentLock = target;
        currentLock.classList.add('reticle-lock--active');
        const label =
          target.getAttribute('data-lock') ??
          (target as HTMLElement).innerText?.slice(0, 24) ??
          target.tagName;
        setLockLabel(label);
        const rect = target.getBoundingClientRect();
        reticle.classList.add('reticle--lock');
        reticle.style.setProperty('--lw', `${rect.width + 12}px`);
        reticle.style.setProperty('--lh', `${rect.height + 12}px`);
        reticle.style.left = `${rect.left + rect.width / 2}px`;
        reticle.style.top = `${rect.top + rect.height / 2}px`;
        tag.style.left = `${rect.right + 8}px`;
        tag.style.top = `${rect.top - 2}px`;
        tag.classList.add('reticle-tag--show');
      } else if (target === null && currentLock !== null) {
        currentLock.classList.remove('reticle-lock--active');
        currentLock = null;
        setLockLabel(null);
        reticle.classList.remove('reticle--lock');
        tag.classList.remove('reticle-tag--show');
      }

      if (target === null) {
        rx += (mx - rx) * 0.35;
        ry += (my - ry) * 0.35;
        reticle.style.left = `${rx}px`;
        reticle.style.top = `${ry}px`;
      }
      } catch {
        // sessiz
      }

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(raf);
      currentLock?.classList.remove('reticle-lock--active');
    };
  }, []);

  return (
    <>
      <div ref={reticleRef} id="reticle" className="reticle" aria-hidden="true">
        <span className="reticle__line reticle__line--h reticle__line--l" />
        <span className="reticle__line reticle__line--h reticle__line--r" />
        <span className="reticle__line reticle__line--v reticle__line--t" />
        <span className="reticle__line reticle__line--v reticle__line--b" />
      </div>
      <div ref={tagRef} id="reticleTag" className="reticle-tag orbitron" aria-hidden="true">
        {lockLabel}
      </div>
    </>
  );
}
