import { connection } from "next/server";
import Link from "next/link";
import { AllowanceDayForm } from "@/components/allowance-day-form";
import { ArrowRightIcon, SlidersIcon, TransferIcon } from "@/components/icons";
import { WalletForm } from "@/components/wallet-form";
import { Zigzag } from "@/components/zigzag";
import { getProfile, getRecentTransactions, getWalletBalances, getWeekComparison } from "@/lib/data";
import { formatManila, greeting, weekdayName } from "@/lib/dates";
import { textOn } from "@/lib/color";
import { formatPeso, splitPeso } from "@/lib/money";
import { safeToSpend } from "@/lib/safe-to-spend";
import type { TransactionRow } from "@/lib/types";

export default async function HomePage() {
  await connection(); // per-request: balances and "today" must never be prerendered
  const now = new Date();
  const [profile, wallets] = await Promise.all([getProfile(), getWalletBalances()]);
  const name = profile.display_name ?? "there";

  if (wallets.length === 0) {
    return (
      <main className="flex flex-col gap-6 px-4 pt-5 pb-8">
        <Header now={now} name={name} />
        <section aria-labelledby="first-wallet" className="flex flex-col gap-4 rounded-[22px] border-2 border-ink bg-slip p-5">
          <div className="flex flex-col gap-1">
            <span className="label-mono text-muted">Step 1 of 1</span>
            <h2 id="first-wallet" className="font-display text-2xl font-extrabold tracking-tight">
              Add your first wallet
            </h2>
            <p className="text-sm text-muted">
              A wallet is anywhere you keep money: cash, a debit card, an e-wallet or savings. You can add more later.
            </p>
          </div>
          <WalletForm submitLabel="Add wallet" />
        </section>
      </main>
    );
  }

  const [week, recent] = await Promise.all([getWeekComparison(now), getRecentTransactions()]);
  const total = wallets.reduce((s, w) => s + w.balance_cents, 0);
  const big = splitPeso(total);
  const safe = profile.allowance_weekday === null ? null : safeToSpend(wallets, profile.allowance_weekday, now);
  const diff = week.lastWeekCents - week.thisWeekCents;

  return (
    <main className="flex flex-col gap-[22px] px-4 pt-5 pb-6">
      <Header now={now} name={name} />

      {/* Balances */}
      <section aria-label="Balances" className="flex flex-col">
        <div className="flex flex-col gap-4 rounded-t-[22px] bg-ink px-5 pt-5 pb-[18px] text-paper">
          <div className="flex items-center justify-between">
            <span className="label-mono text-fog">Across all wallets</span>
            <span className="font-mono text-xs text-mango">PHP</span>
          </div>
          <p className="tabular flex items-baseline gap-0.5 font-display" aria-label={`Total ${formatPeso(total)}`}>
            <span className="text-[28px] font-medium text-mango">{big.sign}₱</span>
            <span className="text-[56px] leading-none font-extrabold tracking-[-0.03em]">{big.whole}</span>
            <span className="text-2xl font-bold text-fog">.{big.fraction}</span>
          </p>
          <ul className="grid grid-cols-2 gap-2">
            {wallets.map((w) =>
              w.counts_as_spendable ? (
                <li key={w.id} className="flex flex-col gap-0.5 rounded-xl border border-ink-soft px-3 py-2.5">
                  <span className="truncate text-xs text-fog">{w.name}</span>
                  <span className="tabular font-display text-[17px] font-bold">{formatPeso(w.balance_cents)}</span>
                </li>
              ) : (
                <li key={w.id} className="flex flex-col gap-0.5 rounded-xl bg-mango px-3 py-2.5 text-ink">
                  <span className="truncate text-xs font-semibold">{w.name}</span>
                  <span className="tabular font-display text-[17px] font-bold">{formatPeso(w.balance_cents)}</span>
                </li>
              ),
            )}
          </ul>
        </div>
        <Zigzag />
      </section>

      {/* Safe to spend today */}
      <section
        aria-label="Safe to spend today"
        className="flex items-center justify-between gap-3 rounded-[18px] border-2 border-ink bg-dagat px-4 py-3.5 text-paper"
      >
        {safe ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="label-mono text-mango">Safe to spend today</span>
              <span className="text-[13px] text-dagat-soft">
                {formatPeso(safe.spendableCents, { whole: true })} spendable ÷ {safe.daysLeft}{" "}
                {safe.daysLeft === 1 ? "day" : "days"} until {weekdayName(profile.allowance_weekday!)}&apos;s allowance
              </span>
            </div>
            <span className="tabular font-display text-[38px] leading-none font-extrabold tracking-tight">
              {formatPeso(safe.safeTodayCents, { whole: true })}
            </span>
          </>
        ) : (
          <div className="flex w-full flex-col gap-3">
            <span className="label-mono text-mango">Safe to spend today</span>
            <AllowanceDayForm current={null} compact />
          </div>
        )}
      </section>

      {/* Quick add (AI parsing arrives in build step 4; for now it prefills the manual form) */}
      <section aria-label="Quick add" className="flex flex-col gap-2">
        <form action="/add" className="flex flex-col gap-2">
          <label htmlFor="quick" className="font-display text-lg font-bold">
            What did you spend on?
          </label>
          <div className="flex items-stretch gap-2">
            <div className="flex h-14 min-w-0 flex-1 items-center gap-2 rounded-2xl border-2 border-ink bg-slip px-3.5 shadow-hard focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-chili">
              <span aria-hidden="true" className="font-mono font-medium text-chili">
                ›
              </span>
              <input
                id="quick"
                name="q"
                autoComplete="off"
                placeholder="jollibee 180, pamasahe 20…"
                className="min-w-0 flex-1 bg-transparent font-mono text-[15px] outline-none"
              />
            </div>
            <button
              type="submit"
              aria-label="Log it"
              className="press flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-chili text-white"
            >
              <ArrowRightIcon strokeWidth={2.5} />
            </button>
          </div>
        </form>
        <p className="text-[13px] text-muted">Type it like a text. You check it before it saves.</p>
      </section>

      {/* This week */}
      <section aria-labelledby="this-week" className="flex flex-col gap-3 pt-1">
        <div className="flex items-baseline justify-between">
          <h2 id="this-week" className="font-display text-lg font-bold">
            This week
          </h2>
          <Link href="/insights" className="text-sm font-semibold underline-offset-2 hover:text-chili">
            See insights
          </Link>
        </div>
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="tabular font-display text-[34px] font-extrabold tracking-tight">
            {formatPeso(week.thisWeekCents, { whole: true })}
          </span>
          {week.lastWeekCents > 0 && diff !== 0 && (
            <span
              className={`rounded-full px-2 py-1 text-[13px] font-semibold ${
                diff > 0 ? "bg-dagat-soft text-dagat" : "bg-sand text-chili"
              }`}
            >
              {formatPeso(Math.abs(diff), { whole: true })} {diff > 0 ? "less" : "more"} than this time last week
            </span>
          )}
        </div>
        {week.thisWeekCents > 0 ? (
          <>
            <div
              role="img"
              aria-label={`Spending split: ${week.categories.map((c) => `${c.name} ${formatPeso(c.total_cents, { whole: true })}`).join(", ")}`}
              className="flex h-3.5 overflow-hidden rounded-full border-[1.5px] border-ink"
            >
              {week.categories.map((c) => (
                <div
                  key={c.category_id ?? "none"}
                  style={{ width: `${(c.total_cents / week.thisWeekCents) * 100}%`, background: c.color }}
                />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
              {week.categories.map((c) => (
                <li key={c.category_id ?? "none"} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-[3px] border border-ink" style={{ background: c.color }} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="tabular font-semibold">{formatPeso(c.total_cents, { whole: true })}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">Nothing spent yet this week.</p>
        )}
      </section>

      {/* Recent */}
      <section aria-labelledby="recent" className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between pb-1">
          <h2 id="recent" className="font-display text-lg font-bold">
            Recent
          </h2>
          <Link href="/activity" className="text-sm font-semibold hover:text-chili">
            All activity
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">Your entries will show up here.</p>
        ) : (
          <ul className="flex flex-col">
            {recent.map((t) => (
              <RecentRow key={t.id} t={t} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Header({ now, name }: { now: Date; name: string }) {
  return (
    <header className="flex items-end justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="label-mono text-muted">{formatManila(now, { weekday: "short", month: "short", day: "numeric" })}</span>
        <h1 className="font-display text-[30px] leading-none font-extrabold tracking-[-0.02em]">
          {greeting(now)}, {name}
        </h1>
      </div>
      <Link
        href="/settings"
        aria-label="Settings"
        className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-ink"
      >
        <SlidersIcon size={20} />
      </Link>
    </header>
  );
}

function RecentRow({ t }: { t: TransactionRow }) {
  const title = t.type === "transfer" ? `${t.wallet?.name} → ${t.to_wallet?.name}` : (t.merchant ?? t.category?.name ?? (t.type === "income" ? "Income" : "Expense"));
  const when = formatManila(t.occurred_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const detail =
    t.type === "transfer"
      ? "Transfer · not counted as spending"
      : `${t.type === "income" ? "Income" : (t.category?.name ?? "Uncategorized")} · ${t.wallet?.name ?? ""} · ${when}`;

  return (
    <li className="flex items-center gap-3 border-b border-dashed border-rule py-2.5 last:border-b-0">
      {t.type === "transfer" ? (
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-ink">
          <TransferIcon size={18} />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-display font-extrabold ${
            t.type === "income" ? "bg-dagat-soft text-dagat" : "text-ink"
          }`}
          style={
            t.type === "expense"
              ? { background: t.category?.color ?? "#cfc5b8", color: textOn(t.category?.color ?? "#cfc5b8") }
              : undefined
          }
        >
          {title.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate font-semibold">{title}</span>
        <span className="truncate text-xs text-muted">{detail}</span>
      </div>
      <span
        className={`tabular font-display font-bold ${
          t.type === "income" ? "text-dagat" : t.type === "transfer" ? "text-muted" : ""
        }`}
      >
        {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
        {formatPeso(t.amount_cents)}
      </span>
    </li>
  );
}
