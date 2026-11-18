import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HISTORY_WINDOW_DAYS } from "@/lib/afford";
import { manilaDayKey, manilaMidnight, manilaMonthKey, manilaWeekRange } from "@/lib/dates";
import type {
  Category,
  CategorySpend,
  Gig,
  Profile,
  TransactionDetail,
  TransactionRow,
  TransactionType,
  WalletBalanceRow,
} from "@/lib/types";

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

/**
 * This week so far vs last week up to the same point (Monday-start, Manila time).
 * Comparing a part-week against a full week would always look like spending less.
 */
export async function getWeekComparison(now: Date) {
  const thisWeek = manilaWeekRange(now);
  const lastWeek = manilaWeekRange(now, 1);
  const [current, previous] = await Promise.all([
    getSpendingByCategory(thisWeek.from, thisWeek.to),
    getSpendingByCategory(lastWeek.from, new Date(now.getTime() - 7 * 86_400_000)),
  ]);
  const sum = (rows: CategorySpend[]) => rows.reduce((s, r) => s + r.total_cents, 0);
  return { categories: current, thisWeekCents: sum(current), lastWeekCents: sum(previous) };
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

const TX_SELECT =
  "id, type, amount_cents, merchant, note, occurred_at, wallet_id, transfer_to_wallet_id, category_id, wallet:wallets!transactions_wallet_id_fkey(name), to_wallet:wallets!transactions_transfer_to_wallet_id_fkey(name), category:categories(name, color)";

export type ActivityFilters = {
  from: Date;
  to: Date;
  type?: TransactionType;
  walletId?: string;
  categoryId?: string;
};

function applyFilters<Q extends { eq: (c: string, v: string) => Q; or: (f: string) => Q }>(q: Q, f: ActivityFilters): Q {
  let out = q;
  if (f.type) out = out.eq("type", f.type);
  // A wallet filter shows money leaving and arriving, so transfers into it are included.
  if (f.walletId) out = out.or(`wallet_id.eq.${f.walletId},transfer_to_wallet_id.eq.${f.walletId}`);
  if (f.categoryId) out = out.eq("category_id", f.categoryId);
  return out;
}

/** Entries in a time range, newest first, plus whether more exist past `limit`. */
export async function getActivity(f: ActivityFilters, limit: number) {
  const supabase = await createClient();
  const query = supabase
    .from("transactions")
    .select(TX_SELECT)
    .gte("occurred_at", f.from.toISOString())
    .lt("occurred_at", f.to.toISOString());
  const { data, error } = await applyFilters(query, f)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (error) throw error;
  const rows = (data ?? []).map((t) => ({
    ...(t as unknown as TransactionDetail),
    amount_cents: toNumber(t.amount_cents),
  }));
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** Spent and received totals for the same filters (transfers are neither). */
export async function getActivityTotals(f: ActivityFilters) {
  const supabase = await createClient();
  const query = supabase
    .from("transactions")
    .select("type, amount_cents")
    .gte("occurred_at", f.from.toISOString())
    .lt("occurred_at", f.to.toISOString());
  const { data, error } = await applyFilters(query, f);
  if (error) throw error;
  let spentCents = 0;
  let receivedCents = 0;
  for (const t of data ?? []) {
    if (t.type === "expense") spentCents += toNumber(t.amount_cents);
    if (t.type === "income") receivedCents += toNumber(t.amount_cents);
  }
  return { spentCents, receivedCents };
}

export async function getTransaction(id: string): Promise<TransactionDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").select(TX_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...(data as unknown as TransactionDetail), amount_cents: toNumber(data.amount_cents) };
}

// ---------------------------------------------------------------------------
// Gigs
// ---------------------------------------------------------------------------

const GIG_SELECT =
  "id, title, work_date, hours, expected_cents, status, paid_at, wallet_id, transaction_id, wallet:wallets(name), income:transactions!gigs_transaction_id_fkey(amount_cents)";

type GigRow = Omit<Gig, "paid_cents" | "wallet_name" | "hours" | "expected_cents"> & {
  hours: number | string | null;
  expected_cents: number | string;
  wallet: { name: string } | null;
  income: { amount_cents: number | string } | null;
};

function toGig(r: GigRow): Gig {
  const { wallet, income, ...rest } = r;
  return {
    ...rest,
    hours: r.hours === null ? null : Number(r.hours),
    expected_cents: toNumber(r.expected_cents),
    paid_cents: income ? toNumber(income.amount_cents) : null,
    wallet_name: wallet?.name ?? null,
  };
}

/** Pending shifts (oldest first), recently paid ones, and totals for the screen. */
export async function getGigs(now: Date) {
  const supabase = await createClient();
  const [pending, paid] = await Promise.all([
    supabase.from("gigs").select(GIG_SELECT).eq("status", "pending").order("work_date").order("created_at"),
    supabase.from("gigs").select(GIG_SELECT).eq("status", "paid").order("paid_at", { ascending: false }).limit(30),
  ]);
  if (pending.error) throw pending.error;
  if (paid.error) throw paid.error;

  const pendingGigs = (pending.data as unknown as GigRow[]).map(toGig);
  const paidGigs = (paid.data as unknown as GigRow[]).map(toGig);
  const month = manilaMonthKey(now);
  const paidThisMonth = paidGigs.filter((g) => g.paid_at && manilaMonthKey(new Date(g.paid_at)) === month);

  return {
    pending: pendingGigs,
    paid: paidGigs,
    pendingCents: pendingGigs.reduce((s, g) => s + g.expected_cents, 0),
    paidThisMonthCents: paidThisMonth.reduce((s, g) => s + (g.paid_cents ?? g.expected_cents), 0),
    paidThisMonthCount: paidThisMonth.length,
  };
}

export async function getGig(id: string): Promise<Gig | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gigs").select(GIG_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toGig(data as unknown as GigRow) : null;
}

/** Sum of pay still owed, for the note on Home. */
export async function getPendingGigTotal(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("gigs").select("expected_cents").eq("status", "pending");
  if (error) throw error;
  return (data ?? []).reduce((s, g) => s + toNumber(g.expected_cents), 0);
}

/** The last shift's title and pay, so logging the usual shift is one tap. */
export async function getLastGig(): Promise<{ title: string; expected_cents: number; hours: number | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gigs")
    .select("title, expected_cents, hours")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { title: data.title, expected_cents: toNumber(data.expected_cents), hours: data.hours === null ? null : Number(data.hours) };
}

// ---------------------------------------------------------------------------
// Afford
// ---------------------------------------------------------------------------

/** Spending over the last 28 days, and how many days of history exist (Manila days). */
export async function getSpendingHistory(now: Date) {
  const supabase = await createClient();
  const windowStart = new Date(now.getTime() - HISTORY_WINDOW_DAYS * 86_400_000);
  const [recent, first] = await Promise.all([
    supabase.from("transactions").select("amount_cents").eq("type", "expense").gte("occurred_at", windowStart.toISOString()),
    supabase.from("transactions").select("occurred_at").order("occurred_at").limit(1).maybeSingle(),
  ]);
  if (recent.error) throw recent.error;
  if (first.error) throw first.error;

  const expenseCents = (recent.data ?? []).reduce((s, t) => s + toNumber(t.amount_cents), 0);
  let historyDays = 0;
  if (first.data) {
    const startKey = manilaDayKey(first.data.occurred_at);
    const [y, m, d] = startKey.split("-").map(Number);
    historyDays = Math.floor((now.getTime() - manilaMidnight(y, m, d).getTime()) / 86_400_000) + 1;
  }
  return { expenseCents, historyDays };
}
