'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { PrintConfig, PrintIconPlacement } from './types';
import {
  DEFAULT_ICON_PLACEMENT,
  ICON_PLACEMENT_LIMITS,
  normalizePrintIconPlacement,
} from './config';

interface PrintIconLayerProps {
  icon: string;
  margin: number;
  placement: PrintConfig['iconPlacement'];
  onPlacementChange: (placement: PrintIconPlacement) => void;
}

type DragStart = Pick<PrintIconPlacement, 'x' | 'y'>;

const commitPlacement = (
  placement: PrintIconPlacement,
  updateDraft: (placement: PrintIconPlacement) => void,
  onPlacementChange: (placement: PrintIconPlacement) => void,
  persist: boolean
) => {
  const normalized = normalizePrintIconPlacement(placement);
  updateDraft(normalized);
  if (persist) {
    onPlacementChange(normalized);
  }
  return normalized;
};

export const PrintIconLayer: React.FC<PrintIconLayerProps> = ({
  icon,
  margin,
  placement,
  onPlacementChange,
}) => {
  const [draftPlacement, setDraftPlacement] = useState<PrintIconPlacement>(() =>
    normalizePrintIconPlacement(placement)
  );
  const contentRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef(draftPlacement);

  const updateDraft = (next: PrintIconPlacement) => {
    draftRef.current = next;
    setDraftPlacement(next);
  };

  useEffect(() => {
    const normalized = normalizePrintIconPlacement(placement);
    draftRef.current = normalized;
    setDraftPlacement(normalized);
  }, [placement]);

  const bind = useGesture(
    {
      onDrag: ({ first, last, movement: [moveX, moveY], memo }) => {
        const rect = contentRef.current?.getBoundingClientRect();
        if (!rect) return memo;

        const start: DragStart =
          first || !memo
            ? { x: draftRef.current.x, y: draftRef.current.y }
            : memo;
        const next = {
          ...draftRef.current,
          x: start.x + (moveX / rect.width) * 100,
          y: start.y + (moveY / rect.height) * 100,
        };
        commitPlacement(next, updateDraft, onPlacementChange, last);
        return start;
      },
      onPinch: ({ event, last, offset: [scale] }) => {
        if (event.cancelable) {
          event.preventDefault();
        }
        const next = {
          ...draftRef.current,
          size: DEFAULT_ICON_PLACEMENT.size * scale,
        };
        commitPlacement(next, updateDraft, onPlacementChange, last);
      },
      onWheel: ({ event, delta: [, deltaY] }) => {
        if (event.cancelable) {
          event.preventDefault();
        }
        const factor = Math.exp(-deltaY * 0.0015);
        const next = {
          ...draftRef.current,
          size: draftRef.current.size * factor,
        };
        commitPlacement(next, updateDraft, onPlacementChange, true);
      },
    },
    {
      drag: {
        filterTaps: true,
        preventDefault: true,
        pointer: { touch: true },
      },
      pinch: {
        from: () => [draftRef.current.size / DEFAULT_ICON_PLACEMENT.size, 0],
        preventDefault: true,
        pointer: { touch: true },
        scaleBounds: {
          min: ICON_PLACEMENT_LIMITS.minSize / DEFAULT_ICON_PLACEMENT.size,
          max: ICON_PLACEMENT_LIMITS.maxSize / DEFAULT_ICON_PLACEMENT.size,
        },
      },
      wheel: {
        eventOptions: { passive: false },
        preventDefault: true,
      },
    }
  );

  const moveByKeyboard = (
    event: React.KeyboardEvent<HTMLDivElement>,
    update: Partial<PrintIconPlacement>
  ) => {
    event.preventDefault();
    commitPlacement(
      { ...draftRef.current, ...update },
      updateDraft,
      onPlacementChange,
      true
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const moveStep = event.shiftKey ? 5 : 1;
    const scaleStep = event.shiftKey ? 5 : 2;

    switch (event.key) {
      case 'ArrowLeft':
        moveByKeyboard(event, { x: draftRef.current.x - moveStep });
        break;
      case 'ArrowRight':
        moveByKeyboard(event, { x: draftRef.current.x + moveStep });
        break;
      case 'ArrowUp':
        moveByKeyboard(event, { y: draftRef.current.y - moveStep });
        break;
      case 'ArrowDown':
        moveByKeyboard(event, { y: draftRef.current.y + moveStep });
        break;
      case '+':
      case '=':
        moveByKeyboard(event, { size: draftRef.current.size + scaleStep });
        break;
      case '-':
      case '_':
        moveByKeyboard(event, { size: draftRef.current.size - scaleStep });
        break;
      default:
        break;
    }
  };

  if (!icon) return null;

  return (
    <div
      ref={contentRef}
      style={{
        position: 'absolute',
        inset: `${margin}mm`,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <div
        {...bind()}
        role="button"
        tabIndex={0}
        data-print-icon-src={icon}
        aria-label="调整打印图标位置和大小"
        onKeyDown={handleKeyDown}
        style={{
          position: 'absolute',
          left: `${draftPlacement.x}%`,
          top: `${draftPlacement.y}%`,
          width: `${draftPlacement.size}%`,
          aspectRatio: '1 / 1',
          transform: 'translate(-50%, -50%)',
          backgroundImage: `url("${icon}")`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          cursor: 'grab',
          pointerEvents: 'auto',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      />
    </div>
  );
};
