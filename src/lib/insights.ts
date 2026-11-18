import { manilaDayKey, manilaMonthKey, manilaMonthRange, manilaWeekRange } from "./dates";

export type Period = "week" | "month";

const DAY = 86_400_000;

/**
 * The current period so far, and the previous period up to the same point, so the
 * comparison is fair (Wednesday vs last Wednesday, the 18th vs last month's 18th).
 */
export function periodRanges(now: Date, period: Period) {
  if (period === "week") {
    const cur = manilaWeekRange(now);
    const prev = manilaWeekRange(now, 1);
    const elapsed = now.getTime() - cur.from.getTime();
    return {
      current: cur,
      previousSamePoint: { from: prev.from, to: new Date(prev.from.getTime() + elapsed) },
      days: 7,
    };
  }
  const key = manilaMonthKey(now);
  const cur = manilaMonthRange(key);
  const [y, m] = key.split("-").map(Number);
  const prevKey = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const prev = manilaMonthRange(prevKey);
  const elapsed = now.getTime() - cur.from.getTime();
  return {
    current: cur,
    // Clamped so the 31st compares with the end of a 30-day month.
    previousSamePoint: { from: prev.from, to: new Date(Math.min(prev.from.getTime() + elapsed, prev.to.getTime())) },
    days: Math.round((cur.to.getTime() - cur.from.getTime()) / DAY),
  };
}

export type DayBucket = { key: string; cents: number; isFuture: boolean; isToday: boolean };

/** One bucket per Manila day of the period, including days still to come (empty). */
export function bucketByDay(
  rows: { amount_cents: number; occurred_at: string }[],
  from: Date,
  days: number,
  now: Date,
): DayBucket[] {
  const today = manilaDayKey(now);
  const buckets: DayBucket[] = [];
  const index = new Map<string, DayBucket>();
  for (let i = 0; i < days; i++) {
    // Noon of each day avoids any edge rounding.
    const key = manilaDayKey(new Date(from.getTime() + i * DAY + 12 * 3_600_000));
    const b = { key, cents: 0, isFuture: key > today, isToday: key === today };
    buckets.push(b);
    index.set(key, b);
  }
  for (const r of rows) {
    const b = index.get(manilaDayKey(r.occurred_at));
    if (b) b.cents += r.amount_cents;
  }
  return buckets;
}

/** A clean axis top above the largest value: 100, 200, 250, 500, 1,000, 2,000, 2,500… in pesos. */
export function niceMax(maxCents: number): number {
  if (maxCents <= 0) return 10_000;
  const pesos = maxCents / 100;
  const pow = 10 ** Math.floor(Math.log10(pesos));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= pesos) ?? 10;
  return Math.round(step * pow * 100);
}
