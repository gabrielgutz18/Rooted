// Installing Rooted as an app (a PWA): registers the offline service worker and keeps
// track of whether this browser can show its own "Install" prompt. Imported first thing
// in main.tsx, because browsers can offer the prompt before React has started.

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios' | 'android' | 'desktop';

const ua = navigator.userAgent;
export const platform: Platform =
  /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'ios' : /android/i.test(ua) ? 'android' : 'desktop';

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** True when Rooted is running as the installed app rather than in a browser tab. */
export function isStandalone(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: window-controls-overlay)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // we offer it from the menu instead of the browser's banner
  deferred = e as BeforeInstallPromptEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  installed = true;
  notify();
});

// Offline support only in the built app; in development it would serve stale files.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

export function useInstall() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((n) => n + 1);
    const mq = matchMedia('(display-mode: standalone)');
    listeners.add(l);
    mq.addEventListener('change', l);
    return () => {
      listeners.delete(l);
      mq.removeEventListener('change', l);
    };
  }, []);
  return {
    installed: installed || isStandalone(),
    canPrompt: deferred !== null,
    platform,
    /** Show the browser's own install dialog. Resolves true if the user installed. */
    async prompt(): Promise<boolean> {
      const e = deferred;
      if (!e) return false;
      deferred = null;
      notify();
      await e.prompt();
      return (await e.userChoice).outcome === 'accepted';
    },
  };
}
