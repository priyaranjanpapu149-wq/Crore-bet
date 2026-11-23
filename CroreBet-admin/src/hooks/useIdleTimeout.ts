import { useEffect, useRef } from 'react';

/**
 * Fires `onIdle` after `idleMs` of no user activity.
 * Resets on mousemove, keydown, click, scroll, touch, wheel.
 */
export function useIdleTimeout(onIdle: () => void, idleMs = 10 * 60 * 1000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onIdle, idleMs);
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
      'click',
    ];

    events.forEach((e) => window.addEventListener(e, reset, { passive: true } as any));
    reset(); // start timer immediately

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [onIdle, idleMs]);
}