import Link from "next/link";
import { connection } from "next/server";
import { z } from "zod";
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon } from "@/components/icons";
import { TransactionRow } from "@/components/transaction-row";
import { getActivity, getActivityTotals, getCategories, getWalletBalances } from "@/lib/data";
import { formatManila, manilaDayKey, manilaMonthKey, manilaMonthRange, shiftMonth } from "@/lib/dates";
import { formatPeso } from "@/lib/money";
import type { TransactionDetail } from "@/lib/types";
import { FilterBar } from "./filter-bar";

const PAGE = 60;

// Anything malformed in the URL is ignored rather than erroring.
const query = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().catch(undefined),
  type: z.enum(["expense", "income", "transfer"]).optional().catch(undefined),
  wallet: z.uuid().optional().catch(undefined),
  category: z.uuid().optional().catch(undefined),
  limit: z.coerce.number().int().min(PAGE).max(1000).optional().catch(undefined),
});

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  await connection();
  const raw = await searchParams;
  const pick = (k: string) => (typeof raw[k] === "string" ? raw[k] : undefined);
  const q = query.parse({
    month: pick("month"),
    type: pick("type"),
    wallet: pick("wallet"),
    category: pick("category"),
    limit: pick("limit"),
  });

  const currentMonth = manilaMonthKey(new Date());
  const month = q.month && q.month <= currentMonth ? q.month : currentMonth;
  const limit = q.limit ?? PAGE;
  const { from, to } = manilaMonthRange(month);
  const filters = {
    from,
    to,
    type: q.type,
    walletId: q.wallet,
    categoryId: q.type && q.type !== "expense" ? undefined : q.category,
  };

  const [{ rows, hasMore }, totals, wallets, categories] = await Promise.all([
    getActivity(filters, limit),
    getActivityTotals(filters),
    getWalletBalances(),
    getCategories(),
  ]);

  const monthLabel = formatManila(from, { month: "long", year: "numeric" });
  const keep = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (filters.type) p.set("type", filters.type);
    if (filters.walletId) p.set("wallet", filters.walletId);
    if (filters.categoryId) p.set("category", filters.categoryId);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `/activity?${p}`;
  };
  const isFiltered = Boolean(filters.type || filters.walletId || filters.categoryId);
  const days = groupByDay(rows);

  return (
    <main className="flex flex-col gap-5 px-4 pt-5 pb-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[30px] font-extrabold tracking-[-0.02em]">Activity</h1>
        <Link
          href="/add"
          className="press flex min-h-11 items-center gap-2 rounded-[14px] border-2 border-ink bg-slip px-3.5 text-sm font-bold"
        >
          <PlusIcon size={18} strokeWidth={2.5} />
          New entry
        </Link>
      </header>

      {/* Month switcher */}
      <nav aria-label="Month" className="flex items-center justify-between gap-2">
        <Link
          href={keep({ month: shiftMonth(month, -1) })}
          aria-label="Previous month"
          className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink"
        >
          <ArrowLeftIcon size={20} />
        </Link>
        <span className="font-display text-lg font-bold" aria-live="polite">
          {monthLabel}
        </span>
        {month < currentMonth ? (
          <Link
            href={keep({ month: shiftMonth(month, 1) })}
            aria-label="Next month"
            className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink"
          >
            <ArrowRightIcon size={20} />
          </Link>
        ) : (
          <span aria-hidden="true" className="size-11" />
        )}
      </nav>

      {/* Totals */}
      <section aria-label="Totals" className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-ink bg-slip p-3.5 shadow-hard">
          <span className="label-mono text-muted">Spent</span>
          <span className="tabular font-display text-[26px] font-extrabold tracking-tight">
            {formatPeso(totals.spentCents, { whole: true })}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border-[1.5px] border-dashed border-muted p-3.5">
          <span className="label-mono text-muted">Received</span>
          <span className="tabular font-display text-[26px] font-bold tracking-tight text-dagat">
            {formatPeso(totals.receivedCents, { whole: true })}
          </span>
        </div>
      </section>

      <FilterBar
        month={month}
        type={filters.type}
        walletId={filters.walletId}
        categoryId={filters.categoryId}
        wallets={wallets}
        categories={categories}
      />

      {/* List */}
      {days.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border-[1.5px] border-dashed border-muted p-5">
          <p className="font-semibold">
            {isFiltered ? "Nothing matches these filters." : `No entries in ${monthLabel}.`}
          </p>
          {isFiltered && (
            <Link href={`/activity?month=${month}`} className="text-sm font-semibold underline">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {days.map((day) => (
            <section key={day.key} aria-labelledby={`day-${day.key}`} className="flex flex-col">
              <div className="flex items-baseline justify-between border-b-2 border-ink pb-1.5">
                <h2 id={`day-${day.key}`} className="font-display text-base font-bold">
                  {day.label}
                </h2>
                {day.spentCents > 0 && (
                  <span className="tabular font-mono text-xs text-muted">
                    −{formatPeso(day.spentCents)}
                  </span>
                )}
              </div>
              <ul className="flex flex-col">
                {day.rows.map((t) => (
                  <TransactionRow key={t.id} t={t} showDate={false} />
                ))}
              </ul>
            </section>
          ))}
          {hasMore && (
            <Link
              href={keep({ month, limit: String(limit + PAGE) })}
              scroll={false}
              className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-dashed border-ink font-display font-bold"
            >
              Show more
            </Link>
          )}
        </div>
      )}
    </main>
  );
}

function groupByDay(rows: TransactionDetail[]) {
  const todayKey = manilaDayKey(new Date());
  const yesterdayKey = manilaDayKey(new Date(Date.now() - 86_400_000));
  const groups: { key: string; label: string; spentCents: number; rows: TransactionDetail[] }[] = [];
  for (const t of rows) {
    const key = manilaDayKey(t.occurred_at);
    let g = groups.at(-1);
    if (!g || g.key !== key) {
      const label =
        key === todayKey
          ? "Today"
          : key === yesterdayKey
            ? "Yesterday"
            : formatManila(t.occurred_at, { weekday: "short", month: "short", day: "numeric" });
      g = { key, label, spentCents: 0, rows: [] };
      groups.push(g);
    }
    g.rows.push(t);
    if (t.type === "expense") g.spentCents += t.amount_cents;
  }
  return groups;
}
