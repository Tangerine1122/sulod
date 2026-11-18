/**
 * "Can I afford it?" (PROJECT_CONTEXT §7.5). Every number and the verdict come from here,
 * in code. The AI only rewords `explain()`'s facts, and `checkExplanation` rejects any
 * wording that brings in a number we didn't give it or flips the verdict.
 */
import { formatPeso } from "./money";

export type Verdict = "yes" | "tight" | "not_yet";

export type AffordInput = {
  item: string;
  priceCents: number;
  /** Sum of wallets that count as spendable (savings excluded). */
  spendableCents: number;
  /** Days until the next allowance (1–7), or 7 when no allowance day is set. */
  daysLeft: number;
  /** e.g. "Monday's allowance", or null when no allowance day is set. */
  untilLabel: string | null;
  /** Average daily spending, or null when there's too little history. */
  usualDailyCents: number | null;
  historyDays: number;
  savingsCents: number;
  pendingGigCents: number;
};

export type AffordResult = AffordInput & {
  afterCents: number;
  dailyAfterCents: number;
  verdict: Verdict;
  reason: "short" | "well_below_usual" | "below_usual" | "covers_usual" | "no_history";
};

export const MIN_HISTORY_DAYS = 3;
export const HISTORY_WINDOW_DAYS = 28;

/** Average spend per day over the last 28 days, or since the first entry if newer. */
export function usualDaily(expenseCentsInWindow: number, historyDays: number): number | null {
  if (historyDays < MIN_HISTORY_DAYS) return null;
  return Math.floor(expenseCentsInWindow / Math.min(HISTORY_WINDOW_DAYS, historyDays));
}

export function decide(input: AffordInput): AffordResult {
  const afterCents = input.spendableCents - input.priceCents;
  const days = Math.max(1, input.daysLeft);
  const dailyAfterCents = afterCents <= 0 ? 0 : Math.floor(afterCents / days);
  const usual = input.usualDailyCents;

  let verdict: Verdict;
  let reason: AffordResult["reason"];
  if (afterCents < 0) {
    verdict = "not_yet";
    reason = "short";
  } else if (usual === null) {
    verdict = "yes";
    reason = "no_history";
  } else if (usual === 0 || dailyAfterCents >= usual) {
    verdict = "yes";
    reason = "covers_usual";
  } else if (dailyAfterCents >= usual * 0.6) {
    verdict = "tight";
    reason = "below_usual";
  } else {
    verdict = "not_yet";
    reason = "well_below_usual";
  }

  return { ...input, daysLeft: days, afterCents, dailyAfterCents, verdict, reason };
}

const peso = (c: number) => formatPeso(c, { whole: true });

export const VERDICT_OPENERS: Record<Verdict, string> = {
  yes: "Yes.",
  tight: "It's tight.",
  not_yet: "Not yet.",
};

/** A plain explanation built from the numbers. Used as-is if the AI is unavailable. */
export function explain(r: AffordResult): string {
  const period = r.untilLabel ? `until ${r.untilLabel}` : `over the next ${r.daysLeft} days`;
  const dayWord = r.daysLeft === 1 ? "day" : "days";
  const parts: string[] = [VERDICT_OPENERS[r.verdict]];

  if (r.reason === "short") {
    parts.push(
      `It costs ${peso(r.priceCents)} but you have ${peso(r.spendableCents)} to spend, so you'd be ${peso(-r.afterCents)} short ${period}.`,
    );
  } else {
    parts.push(
      `After buying it you'd have ${peso(r.afterCents)} for the next ${r.daysLeft} ${dayWord}, about ${peso(r.dailyAfterCents)} a day.`,
    );
    if (r.reason === "no_history") {
      parts.push(`Sulod only has ${r.historyDays} ${r.historyDays === 1 ? "day" : "days"} of your spending, so it can't compare with your usual yet.`);
    } else if (r.reason === "covers_usual") {
      parts.push(`You usually spend around ${peso(r.usualDailyCents ?? 0)} a day, so there's still room.`);
    } else if (r.reason === "below_usual") {
      parts.push(`That's a bit under your usual ${peso(r.usualDailyCents ?? 0)} a day, so you'd need to spend a little less.`);
    } else {
      parts.push(`You usually spend around ${peso(r.usualDailyCents ?? 0)} a day, so that would be hard to stick to.`);
    }
  }

  if (r.pendingGigCents > 0) {
    parts.push(`${peso(r.pendingGigCents)} of gig pay is on the way but isn't counted until it lands.`);
  }
  return parts.join(" ");
}

/** The numbers the explanation may mention: every amount shown on screen, plus day counts. */
export function allowedNumbers(r: AffordResult): Set<string> {
  const cents = [
    r.priceCents,
    r.spendableCents,
    r.afterCents,
    -r.afterCents,
    r.dailyAfterCents,
    r.usualDailyCents ?? 0,
    r.savingsCents,
    r.pendingGigCents,
  ];
  const out = new Set<string>([String(r.daysLeft), String(r.historyDays), "1", "60"]);
  for (const c of cents) {
    if (c <= 0) continue;
    const whole = Math.floor(c / 100);
    out.add(String(whole));
    out.add(String(Math.round(c / 100)));
    out.add((c / 100).toFixed(2));
  }
  return out;
}

/**
 * Accepts the AI's wording only if it starts with the right verdict and every number in it
 * is one we gave it. Otherwise the caller uses `explain()`.
 */
export function checkExplanation(text: string, r: AffordResult): boolean {
  const t = text.trim();
  if (!t || t.length > 400) return false;
  if (!t.startsWith(VERDICT_OPENERS[r.verdict])) return false;
  const allowed = allowedNumbers(r);
  const numbers = t.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return numbers.every((n) => allowed.has(n.replace(/,/g, "")));
}
