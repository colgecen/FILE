import { useEffect, useState } from 'react';
import { errorStore } from './errorStore';

const FLASH_MS = 600;

export function useErrorFlash(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer = 0;
    let previous = errorStore.getRecords().length;
    const unsubscribe = errorStore.subscribe(() => {
      const count = errorStore.getRecords().length;
      if (count <= previous) {
        previous = count;
        return;
      }
      previous = count;
      setActive(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setActive(false), FLASH_MS);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return active;
}