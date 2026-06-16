'use client';

import React, { useEffect, useRef, useState } from 'react';

interface NotesTextareaProps {
  value: string;
  onValueChange: (value: string) => void;
}

interface ScrollShadowState {
  top: boolean;
  bottom: boolean;
}

const EMPTY_SCROLL_SHADOW_STATE: ScrollShadowState = {
  top: false,
  bottom: false,
};

const getScrollShadowState = (
  element: HTMLTextAreaElement | null
): ScrollShadowState => {
  if (!element) {
    return EMPTY_SCROLL_SHADOW_STATE;
  }

  const canScroll = element.scrollHeight > element.clientHeight + 1;
  return {
    top: canScroll && element.scrollTop > 1,
    bottom:
      canScroll &&
      element.scrollTop + element.clientHeight < element.scrollHeight - 1,
  };
};

const syncScrollShadowState = (
  element: HTMLTextAreaElement | null,
  setScrollShadow: React.Dispatch<React.SetStateAction<ScrollShadowState>>
) => {
  const nextScrollShadow = getScrollShadowState(element);

  setScrollShadow(prev =>
    prev.top === nextScrollShadow.top && prev.bottom === nextScrollShadow.bottom
      ? prev
      : nextScrollShadow
  );
};

const NotesTextarea: React.FC<NotesTextareaProps> = ({
  value,
  onValueChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollShadow, setScrollShadow] = useState<ScrollShadowState>(
    EMPTY_SCROLL_SHADOW_STATE
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      syncScrollShadowState(textareaRef.current, setScrollShadow);
    });

    return () => cancelAnimationFrame(frame);
  }, [value]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const resizeObserver = new ResizeObserver(() => {
      syncScrollShadowState(element, setScrollShadow);
    });
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  function handleScroll() {
    syncScrollShadowState(textareaRef.current, setScrollShadow);
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    onValueChange(event.target.value);
  }

  return (
    <label
      htmlFor="brewing-notes"
      className="relative block h-full min-h-0 cursor-text overflow-hidden pb-4"
    >
      <textarea
        ref={textareaRef}
        id="brewing-notes"
        name="brewingNotes"
        value={value}
        onScroll={handleScroll}
        onChange={handleChange}
        aria-label="冲煮感受"
        className="block h-full min-h-0 w-full resize-none overflow-y-auto overscroll-contain border-none bg-transparent text-sm font-medium text-neutral-800 placeholder:text-neutral-300 focus:outline-none dark:text-neutral-200 dark:placeholder:text-neutral-600"
        placeholder="记录一下这杯的感受..."
      />
      <span
        aria-hidden="true"
        className={`fade-mask-to-b pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-neutral-50 transition-opacity duration-200 dark:bg-neutral-900 ${
          scrollShadow.top ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <span
        aria-hidden="true"
        className={`fade-mask-to-t pointer-events-none absolute inset-x-0 bottom-4 z-10 h-6 bg-neutral-50 transition-opacity duration-200 dark:bg-neutral-900 ${
          scrollShadow.bottom ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </label>
  );
};

export default NotesTextarea;
