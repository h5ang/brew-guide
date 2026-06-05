import { useCallback, useMemo, useRef } from 'react';
import type { TouchEventHandler } from 'react';

export interface NavigationSwipeControl {
  enabled: boolean;
  isCollapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
}

const AXIS_LOCK_DISTANCE = 10;
const AXIS_LOCK_RATIO = 1.2;
const SWIPE_DISTANCE = 44;

export const useNavigationSwipe = (control?: NavigationSwipeControl) => {
  const startRef = useRef({ x: 0, y: 0 });
  const latestRef = useRef({ x: 0, y: 0 });
  const axisRef = useRef<'horizontal' | 'vertical' | null>(null);
  const isTrackingRef = useRef(false);

  const reset = useCallback(() => {
    isTrackingRef.current = false;
    axisRef.current = null;
  }, []);

  const handleTouchStart = useCallback<TouchEventHandler<HTMLElement>>(
    event => {
      if (!control?.enabled || event.touches.length !== 1) {
        reset();
        return;
      }

      const touch = event.touches[0];
      const point = { x: touch.clientX, y: touch.clientY };
      startRef.current = point;
      latestRef.current = point;
      axisRef.current = null;
      isTrackingRef.current = true;
    },
    [control?.enabled, reset]
  );

  const handleTouchMove = useCallback<TouchEventHandler<HTMLElement>>(
    event => {
      if (!control?.enabled || !isTrackingRef.current) return;
      if (event.touches.length !== 1) {
        reset();
        return;
      }

      const touch = event.touches[0];
      latestRef.current = { x: touch.clientX, y: touch.clientY };

      if (axisRef.current) return;

      const deltaX = latestRef.current.x - startRef.current.x;
      const deltaY = latestRef.current.y - startRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (Math.max(absX, absY) < AXIS_LOCK_DISTANCE) return;

      axisRef.current =
        absY > absX * AXIS_LOCK_RATIO ? 'vertical' : 'horizontal';
    },
    [control?.enabled, reset]
  );

  const handleTouchEnd = useCallback<TouchEventHandler<HTMLElement>>(() => {
    if (!control?.enabled || !isTrackingRef.current) {
      reset();
      return;
    }

    const deltaX = latestRef.current.x - startRef.current.x;
    const deltaY = latestRef.current.y - startRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const isVerticalSwipe =
      axisRef.current === 'vertical' &&
      absY >= SWIPE_DISTANCE &&
      absY > absX * AXIS_LOCK_RATIO;

    reset();

    if (!isVerticalSwipe) return;

    if (deltaY < 0) {
      control.onCollapse();
      return;
    }

    control.onExpand();
  }, [control, reset]);

  return useMemo(
    () =>
      control?.enabled
        ? {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            onTouchCancel: reset,
          }
        : {},
    [control?.enabled, handleTouchEnd, handleTouchMove, handleTouchStart, reset]
  );
};
