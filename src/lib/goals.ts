import { manilaDayKey } from "./dates";

const DAY = 86_400_000;

export type GoalMath = {
  percent: number; // 0–100, whole number
  remainingCents: number;
  done: boolean;
  /** Per week still needed to hit the date, or null when there's no date or it's done. */
  weeklyCents: number | null;
  weeksLeft: number | null;
  overdue: boolean;
};

export function goalMath(g: { target_cents: number; saved_cents: number; target_date: string | null }, now: Date): GoalMath {
  const remainingCents = Math.max(0, g.target_cents - g.saved_cents);
  const done = remainingCents === 0;
  const percent = Math.min(100, Math.floor((g.saved_cents / g.target_cents) * 100));

  if (done || !g.target_date) return { percent, remainingCents, done, weeklyCents: null, weeksLeft: null, overdue: false };

  const today = manilaDayKey(now);
  if (g.target_date < today) return { percent, remainingCents, done, weeklyCents: null, weeksLeft: 0, overdue: true };

  const days = Math.round((Date.parse(`${g.target_date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);
  const weeksLeft = Math.max(1, Math.ceil(days / 7));
  return {
    percent,
    remainingCents,
    done,
    weeksLeft,
    weeklyCents: Math.ceil(remainingCents / weeksLeft / 100) * 100, // round up to a whole peso
    overdue: false,
  };
}

/** Savings not yet set aside for any goal. Negative means goals claim more than is saved. */
export function unassignedSavings(savingsCents: number, goals: { saved_cents: number }[]): number {
  return savingsCents - goals.reduce((s, g) => s + g.saved_cents, 0);
}
