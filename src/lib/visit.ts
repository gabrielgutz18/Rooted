// Jesus visits your tree now and then, at a time you can't know ahead. While He is there,
// the note you write grows the tree 3×; then He blesses it and goes. Tweak the numbers here.
//
// When He comes is worked out from your account and the day, so it's the same on every device
// and reloading the page can't bring Him. A visit ends early once a note is written during it
// (on any device), so only one note per visit is tripled. Only dates are used (never note
// text), so this stays on the device like the rest of the notes.

import { useEffect, useMemo, useState } from 'react';
import { dayKey } from './growth';

/** How much the note written during a visit grows the tree. */
export const VISIT_MULTIPLIER = 3;
/** The share of days He comes by. */
export const VISIT_CHANCE = 0.5;
/** He arrives at a random minute between these hours (your local time)… */
export const ARRIVE_FROM = 7;
export const ARRIVE_UNTIL = 20;
/** …and stays this long, unless a note is written first. */
export const STAY_MINUTES = 180;

export interface Visit {
  start: number; // ms since 1970
  end: number;
}

/** 0…1 from a string, the same every time (FNV-1a, then mixed). */
function chance(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** The visit planned for this person on this (local) day, or null when He doesn't come that day. */
export function visitOn(userId: string, day: Date): Visit | null {
  const key = `${userId}|${dayKey(day)}`;
  if (chance(`${key}|day`) >= VISIT_CHANCE) return null;
  const minute = Math.floor(chance(`${key}|at`) * (ARRIVE_UNTIL - ARRIVE_FROM) * 60);
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), ARRIVE_FROM, minute).getTime();
  return { start, end: start + STAY_MINUTES * 60000 };
}

/** Whether a note was written during the visit (which ends it). */
export const noteDuring = (v: Visit, notes: { created_at: string }[]) =>
  notes.some((n) => {
    const at = Date.parse(n.created_at);
    return at >= v.start && at < v.end;
  });

/** The visit going on at `now` that no note has ended yet, or null. */
export function currentVisit(userId: string, now: number, notes: { created_at: string }[]): Visit | null {
  const d = new Date(now);
  // yesterday's too, in case a stay ever runs past midnight
  for (const day of [d, new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)]) {
    const v = visitOn(userId, day);
    if (v && now >= v.start && now < v.end && !noteDuring(v, notes)) return v;
  }
  return null;
}

/**
 * ?visit=now starts a visit when the page opens, to try it out. Only in trial mode (this
 * browser only), so it can't be used to grow a real tree faster.
 */
export function previewVisit(trial: boolean): Visit | null {
  if (!trial || new URLSearchParams(location.search).get('visit') !== 'now') return null;
  const start = Date.now() - 60000;
  return { start, end: start + STAY_MINUTES * 60000 };
}

/**
 * The visit going on now, kept up to date as time passes: He arrives and leaves on time, and
 * goes once a note is written. `on` false: no visits (the notes can't be read here yet).
 * In trial mode only `preview` brings Him, so the tests stay the same at any time of day.
 */
export function useVisit(userId: string, notes: { created_at: string }[], on: boolean, trial: boolean, preview: Visit | null): Visit | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 20000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return useMemo(() => {
    if (!on) return null;
    if (preview) return now < preview.end && !noteDuring(preview, notes) ? preview : null;
    return trial ? null : currentVisit(userId, now, notes);
  }, [on, preview, trial, userId, now, notes]);
}
