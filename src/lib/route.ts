// The pages that have their own address. Everything else is the app at "/".
//
// A visitor can open these addresses directly (a shared link, a refresh), so the host must
// answer them with index.html too: see public/_redirects (Netlify, Cloudflare Pages) and
// vercel.json (Vercel). The dev server and `vite preview` already do. A new page needs a
// line in all three.

import { useSyncExternalStore } from 'react';

export const PATHS = {
  home: '/',
  developer: '/developer',
} as const;

export type Page = keyof typeof PATHS;

const BY_PATH = new Map<string, Page>(Object.entries(PATHS).map(([page, path]) => [path, page as Page]));

/** "/developer/" and "/Developer" are the same page; an unknown address is the app. */
function pageOf(pathname: string): Page {
  const path = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  return BY_PATH.get(path) ?? 'home';
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('popstate', cb); // the browser's own back and forward buttons
  return () => {
    listeners.delete(cb);
    window.removeEventListener('popstate', cb);
  };
}

const snapshot = () => pageOf(location.pathname);

/** The page the address bar is on; re-renders when it changes. */
export function usePage(): Page {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Go to a page, as a new step in the browser's history (so Back returns here). */
export function navigate(page: Page) {
  if (pageOf(location.pathname) === page) return;
  // ?hour= and ?tree= previews carry over
  history.pushState({ rooted: true }, '', PATHS[page] + location.search);
  window.scrollTo({ top: 0 });
  listeners.forEach((f) => f());
}

/**
 * Back to where the visitor came from inside Rooted. If they opened this page straight
 * from a link, there is nothing of ours to go back to, so go to the app instead of
 * leaving the site.
 */
export function goBack() {
  if ((history.state as { rooted?: boolean } | null)?.rooted) history.back();
  else {
    history.replaceState(null, '', PATHS.home + location.search);
    listeners.forEach((f) => f());
  }
}
