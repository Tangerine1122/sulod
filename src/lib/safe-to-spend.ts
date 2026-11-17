import { manilaParts } from "./dates";

export type WalletBalance = {
  balance_cents: number;
  counts_as_spendable: boolean;
};

export type SafeToSpend = {
  spendableCents: number;
  daysLeft: number;
  safeTodayCents: number;
};

/**
 * Days from today up to (not including) the next allowance day, minimum 1.
 * If today is allowance day, the next one is 7 days away.
 */
export function daysUntilAllowance(now: Date, allowanceWeekday: number): number {
  const today = manilaParts(now).weekday;
  const diff = (allowanceWeekday - today + 7) % 7;
  return diff === 0 ? 7 : diff;
}

/**
 * Safe to spend today = spendable balance ÷ days until the next allowance.
 * Savings wallets (counts_as_spendable = false) are never included.
 * A negative spendable balance gives 0, not a negative allowance.
 */
export function safeToSpend(wallets: WalletBalance[], allowanceWeekday: number, now: Date): SafeToSpend {
  const spendableCents = wallets
    .filter((w) => w.counts_as_spendable)
    .reduce((sum, w) => sum + w.balance_cents, 0);
  const daysLeft = daysUntilAllowance(now, allowanceWeekday);
  const safeTodayCents = spendableCents <= 0 ? 0 : Math.floor(spendableCents / daysLeft);
  return { spendableCents, daysLeft, safeTodayCents };
}
