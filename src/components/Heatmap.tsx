import { useEffect, useMemo, useRef } from 'react';
import { dayKey, type DayStat } from '../lib/growth';
import { useT } from '../lib/i18n';

const WEEKS = 53;

const level = (points: number) => (points <= 0 ? 0 : points < 15 ? 1 : points < 30 ? 2 : points < 50 ? 3 : 4);

/** GitHub-style year of activity: one square per day, greener the more the tree grew. */
export default function Heatmap({ days }: { days: DayStat[] }) {
  const t = useT();
  const scroller = useRef<HTMLDivElement>(null);
  const fmt = useMemo(() => new Intl.DateTimeFormat(t.locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), [t.locale]);

  const { cols, labels, total } = useMemo(() => {
    const monthFmt = new Intl.DateTimeFormat(t.locale, { month: 'short' });
    const map = new Map(days.map((d) => [d.day, d]));
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - (WEEKS - 1) * 7);
    const cols: { key: string; date: Date; stat?: DayStat; future: boolean }[][] = [];
    const labels: string[] = [];
    let total = 0;
    let lastMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
        const key = dayKey(date);
        const stat = map.get(key);
        if (stat) total += stat.count;
        col.push({ key, date, stat, future: date > today });
      }
      const m = col[0].date.getMonth();
      labels.push(m !== lastMonth ? monthFmt.format(col[0].date) : '');
      lastMonth = m;
      cols.push(col);
    }
    return { cols, labels, total };
  }, [days, t.locale]);

  // Start scrolled to today on narrow screens.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);

  return (
    <div className="heat">
      <div className="heat-scroll" ref={scroller}>
        <div className="heat-grid" role="img" aria-label={t.yearNotes(total)}>
          {cols.map((col, i) => (
            <div key={i} className="heat-col">
              <span className="heat-month">{labels[i]}</span>
              {col.map((c) =>
                c.future ? (
                  <span key={c.key} className="heat-cell is-future" />
                ) : (
                  <span
                    key={c.key}
                    className={`heat-cell l${level(c.stat?.points ?? 0)}`}
                    title={c.stat ? t.dayTitle(c.stat.count, c.stat.points, fmt.format(c.date)) : t.nothingYet(fmt.format(c.date))}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="heat-legend">
        <span>{t.yearNotes(total)}</span>
        <span className="heat-key">
          {t.less}
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`heat-cell l${l}`} />
          ))}
          {t.more}
        </span>
      </div>
    </div>
  );
}
