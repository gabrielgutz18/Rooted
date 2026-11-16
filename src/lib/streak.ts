// The streak lamp and the tree losing its leaves. Tweak the numbers here.

import { dayKey, type DayStat } from './growth';

export type FlameId = 'ember' | 'gold' | 'emerald' | 'sky' | 'sapphire' | 'violet' | 'glory';

/** The lamp's fire changes colour when the streak reaches each of these. */
export const FLAMES: { id: FlameId; min: number }[] = [
  { id: 'ember', min: 1 },
  { id: 'gold', min: 10 },
  { id: 'emerald', min: 20 },
  { id: 'sky', min: 30 },
  { id: 'sapphire', min: 50 },
  { id: 'violet', min: 100 },
  { id: 'glory', min: 200 },
];

/** Which fire burns at this streak; -1 when the lamp is out. */
export function flameIndex(streak: number): number {
  let i = -1;
  for (let k = 0; k < FLAMES.length; k++) if (streak >= FLAMES[k].min) i = k;
  return i;
}

/** Leaves stay full this many days after the last note… */
export const LEAVES_HOLD_DAYS = 2;
/** …and are all gone this many days after it. */
export const LEAVES_GONE_DAYS = 14;

const DAY = 86400000;

/** Whole days since the last day with a note (0 = wrote today); null when there are none. */
export function daysIdle(lastDay: string | null | undefined, now = new Date()): number | null {
  if (!lastDay) return null;
  const [y, m, d] = lastDay.split('-').map(Number);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - new Date(y, m - 1, d).getTime()) / DAY));
}

/** The latest day with a note, as YYYY-MM-DD. */
export const lastDayOf = (days: DayStat[]): string | null =>
  days.reduce<string | null>((a, d) => (d.count > 0 && (!a || d.day > a) ? d.day : a), null);

/** A timestamp's local day, as YYYY-MM-DD. */
export const dayOf = (iso: string | null | undefined): string | null => (iso ? dayKey(new Date(iso)) : null);

/** 0 = full leaves, 1 = bare branches. */
export function barenessFor(idle: number | null): number {
  if (idle == null) return 0;
  return Math.min(1, Math.max(0, (idle - LEAVES_HOLD_DAYS) / (LEAVES_GONE_DAYS - LEAVES_HOLD_DAYS)));
}
