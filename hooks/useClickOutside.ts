import React, { useEffect, RefObject } from 'react';

type AnyEvent = MouseEvent | TouchEvent;

export const useClickOutside = <T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: AnyEvent) => void
): void => {
  useEffect(() => {
    const listener = (event: AnyEvent) => {
      const el = ref.current;
      // Ничего не делать, если клик произошел внутри элемента или его потомков
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};
