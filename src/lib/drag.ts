// Press and hold a note, then drag it onto a folder. Works with a mouse and a finger.
//
// Holding still first is what tells a drag apart from everything else: a quick swipe still
// scrolls the page, and a quick mouse drag still selects text. Once the note lifts, the page
// stops scrolling under the finger, scrolls by itself near the top and bottom of the screen,
// and Escape puts the note back. Drop targets are any elements with a `data-drop` value.

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export interface Dragging {
  id: string;
  x: number;
  y: number;
  /** the data-drop value under the pointer, if any */
  over: string | null;
}

const HOLD_MS = { mouse: 250, touch: 350 };
const SLOP_PX = { mouse: 5, touch: 10 }; // moving more than this before the hold ends cancels it
const EDGE_PX = 72; // this close to the top or bottom of the screen, the page scrolls
const MAX_SCROLL = 16; // px per frame, right at the edge
const NOT_FROM = 'button, a, input, textarea, select, label, summary, [contenteditable="true"], [data-no-drag]';

export function useHoldDrag(onDrop: (id: string, target: string) => void) {
  const [drag, setDrag] = useState<Dragging | null>(null);
  const dropRef = useRef(onDrop);
  const stopRef = useRef<() => void>(() => {});
  const holding = useRef(false); // a note is lifted right now
  useEffect(() => {
    dropRef.current = onDrop;
  });
  useEffect(() => () => stopRef.current(), []);

  /**
   * Put this on the element around the draggable things. A finger moving a lifted note mustn't
   * scroll the page, and the browser only lets a page stop that if the listener was already
   * there when the finger touched down (so it can't be added at lift time).
   */
  const zone = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const hold = (ev: TouchEvent) => {
      if (holding.current && ev.cancelable) ev.preventDefault();
    };
    el.addEventListener('touchmove', hold, { passive: false });
    return () => el.removeEventListener('touchmove', hold);
  }, []);

  const start = useCallback((id: string, e: ReactPointerEvent) => {
    if (e.button !== 0 || !e.isPrimary) return;
    if ((e.target as Element).closest(NOT_FROM)) return;
    stopRef.current();
    const kind = e.pointerType === 'mouse' ? 'mouse' : 'touch';
    const pointerId = e.pointerId;
    const x0 = e.clientX, y0 = e.clientY;
    let x = x0, y = y0;
    let lifted = false;
    let over: string | null = null;
    let frame = 0;

    const hitTest = () => {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]');
      over = el?.dataset.drop ?? null;
    };
    const show = () => setDrag({ id, x, y, over });

    // while lifted: the page scrolls near the edges, and what's under the pointer follows
    const tick = () => {
      const h = window.innerHeight;
      const push = y < EDGE_PX ? -(EDGE_PX - y) : y > h - EDGE_PX ? EDGE_PX - (h - y) : 0;
      if (push) window.scrollBy(0, Math.round((push / EDGE_PX) * MAX_SCROLL));
      hitTest();
      show();
      frame = requestAnimationFrame(tick);
    };

    const block = (ev: Event) => ev.preventDefault();
    const lift = () => {
      lifted = holding.current = true;
      window.getSelection()?.removeAllRanges();
      document.documentElement.classList.add('is-dragging-note');
      // a held note mustn't select text or open the long-press menu (scrolling: see zone)
      document.addEventListener('contextmenu', block, true);
      document.addEventListener('selectstart', block, true);
      navigator.vibrate?.(12);
      frame = requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(lift, HOLD_MS[kind]);

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      x = ev.clientX;
      y = ev.clientY;
      if (!lifted && Math.hypot(x - x0, y - y0) > SLOP_PX[kind]) stop(); // scrolling or selecting instead
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const was = lifted;
      x = ev.clientX;
      y = ev.clientY;
      if (was) hitTest();
      const target = was ? over : null;
      stop();
      if (was) {
        // the click that follows letting go mustn't press whatever is under the pointer
        const swallow = (c: Event) => {
          c.stopPropagation();
          c.preventDefault();
        };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, true), 0);
      }
      if (target) dropRef.current(id, target);
    };
    const cancel = (ev: PointerEvent) => ev.pointerId === pointerId && stop();
    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && lifted) {
        ev.preventDefault();
        stop();
      }
    };

    function stop() {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key, true);
      document.removeEventListener('contextmenu', block, true);
      document.removeEventListener('selectstart', block, true);
      document.removeEventListener('dragstart', block, true);
      document.documentElement.classList.remove('is-dragging-note');
      stopRef.current = () => {};
      if (lifted) setDrag(null);
      lifted = holding.current = false;
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key, true);
    // the browser's own drag (of selected text) would take the pointer away
    document.addEventListener('dragstart', block, true);
    stopRef.current = stop;
  }, []);

  return { drag, start, zone };
}
