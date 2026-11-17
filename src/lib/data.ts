import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { manilaWeekRange } from "@/lib/dates";
import type { Category, CategorySpend, Profile, TransactionRow, WalletBalanceRow } from "@/lib/types";

// Postgres bigint arrives as a string; money must be a number of centavos in the app.
const toNumber = (v: unknown) => (typeof v === "string" ? Number(v) : (v as number));

/** The signed-in user's id. Redirects to /login when there is no session. */
export const requireUserId = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) redirect("/login");
  return sub;
});

export async function getProfile(): Promise<Profile> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, currency, allowance_weekday")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getWalletBalances(): Promise<WalletBalanceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wallet_balances")
    .select("id, name, type, counts_as_spendable, balance_cents")
    .order("counts_as_spendable", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []).map((w) => ({ ...w, balance_cents: toNumber(w.balance_cents) }));
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, color, is_default")
    .order("is_default", { ascending: false })
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function getRecentTransactions(limit = 6): Promise<TransactionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, type, amount_cents, merchant, note, occurred_at, wallet:wallets!transactions_wallet_id_fkey(name), to_wallet:wallets!transactions_transfer_to_wallet_id_fkey(name), category:categories(name, color)",
    )
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((t) => ({
    ...(t as unknown as TransactionRow),
    amount_cents: toNumber(t.amount_cents),
  }));
}

export async function getSpendingByCategory(from: Date, to: Date): Promise<CategorySpend[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("spending_by_category", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw error;
  return ((data ?? []) as CategorySpend[]).map((r) => ({ ...r, total_cents: toNumber(r.total_cents) }));
}

/** This week and last week (Monday-start, Manila time). */
export async function getWeekComparison(now: Date) {
  const thisWeek = manilaWeekRange(now);
  const lastWeek = manilaWeekRange(now, 1);
  const [current, previous] = await Promise.all([
    getSpendingByCategory(thisWeek.from, thisWeek.to),
    getSpendingByCategory(lastWeek.from, lastWeek.to),
  ]);
  const sum = (rows: CategorySpend[]) => rows.reduce((s, r) => s + r.total_cents, 0);
  return { categories: current, thisWeekCents: sum(current), lastWeekCents: sum(previous) };
}
