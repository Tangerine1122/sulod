import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeftIcon } from "@/components/icons";
import { Zigzag } from "@/components/zigzag";
import { decide, usualDaily, type Verdict } from "@/lib/afford";
import { explainWithAI } from "@/lib/afford-ai";
import { getPendingGigTotal, getProfile, getSpendingHistory, getWalletBalances } from "@/lib/data";
import { weekdayName } from "@/lib/dates";
import { formatPeso, parsePesoToCents } from "@/lib/money";
import { daysUntilAllowance } from "@/lib/safe-to-spend";

const MAX_PRICE_CENTS = 100_000_000; // ₱1,000,000

export default async function AffordPage({ searchParams }: PageProps<"/afford">) {
  await connection();
  const sp = await searchParams;
  const item = typeof sp.item === "string" ? sp.item.trim().slice(0, 60) : "";
  const priceCents = typeof sp.amount === "string" ? parsePesoToCents(sp.amount) : null;
  const valid = priceCents !== null && priceCents <= MAX_PRICE_CENTS;

  return (
    <main className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink"
        >
          <ArrowLeftIcon size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">Can I afford it?</h1>
      </header>
      {valid ? <Answer item={item} priceCents={priceCents} /> : <AskForm item={item} />}
    </main>
  );
}

/** Opened directly, or the question had no price: ask for it. Works without JavaScript. */
function AskForm({ item }: { item: string }) {
  return (
    <form action="/afford" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="afford-amount" className="label-mono text-muted">
          How much is it?
        </label>
        <div className="flex h-16 items-center gap-1 rounded-2xl border-2 border-ink bg-slip px-4 shadow-hard focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-chili">
          <span aria-hidden="true" className="font-display text-2xl font-medium text-muted">
            ₱
          </span>
          <input
            id="afford-amount"
            name="amount"
            required
            inputMode="decimal"
            autoFocus
            placeholder="0.00"
            className="tabular min-w-0 flex-1 bg-transparent font-display text-[32px] font-extrabold tracking-tight outline-none"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="afford-item" className="text-sm text-muted">
          What is it? <span className="text-xs">(optional)</span>
        </label>
        <input
          id="afford-item"
          name="item"
          maxLength={60}
          defaultValue={item}
          placeholder="Shoes, headphones, concert ticket…"
          className="h-12 rounded-xl border-2 border-ink bg-slip px-3 text-base"
        />
      </div>
      <button
        type="submit"
        className="press h-14 rounded-2xl border-2 border-ink bg-chili font-display text-lg font-bold text-white"
      >
        Check
      </button>
      <p className="text-[13px] text-muted">
        Tip: you can also type it in the box on Home, like &ldquo;can I afford 2500 shoes?&rdquo;
      </p>
    </form>
  );
}

const stamp: Record<Verdict, { label: string; className: string }> = {
  yes: { label: "YES", className: "border-dagat text-dagat" },
  tight: { label: "TIGHT", className: "border-ink bg-mango text-ink" },
  not_yet: { label: "NOT YET", className: "border-ink bg-chili text-white" },
};

async function Answer({ item, priceCents }: { item: string; priceCents: number }) {
  const now = new Date();
  const [profile, wallets, pendingGigCents, history] = await Promise.all([
    getProfile(),
    getWalletBalances(),
    getPendingGigTotal(),
    getSpendingHistory(now),
  ]);

  const allowanceDay = profile.allowance_weekday;
  const result = decide({
    item,
    priceCents,
    spendableCents: wallets.filter((w) => w.counts_as_spendable).reduce((s, w) => s + w.balance_cents, 0),
    savingsCents: wallets.filter((w) => !w.counts_as_spendable).reduce((s, w) => s + w.balance_cents, 0),
    daysLeft: allowanceDay === null ? 7 : daysUntilAllowance(now, allowanceDay),
    untilLabel: allowanceDay === null ? null : `${weekdayName(allowanceDay)}'s allowance`,
    usualDailyCents: usualDaily(history.expenseCents, history.historyDays),
    historyDays: history.historyDays,
    pendingGigCents,
  });
  const { text } = await explainWithAI(result);
  const s = stamp[result.verdict];
  const peso = (c: number) => formatPeso(c, { whole: true });
  const typed = `can I afford ${item ? `${item} ` : ""}${peso(priceCents)}?`;

  const rows: [string, string, boolean?][] = [
    ["Spendable now", peso(result.spendableCents)],
    result.afterCents >= 0
      ? ["Left after buying", peso(result.afterCents)]
      : ["Short by", peso(-result.afterCents)],
  ];
  if (result.afterCents >= 0) {
    rows.push([
      result.untilLabel ? `Per day until ${result.untilLabel.replace("'s allowance", "")} (${result.daysLeft})` : `Per day for ${result.daysLeft} days`,
      peso(result.dailyAfterCents),
      true,
    ]);
  }
  rows.push(["Your usual per day", result.usualDailyCents === null ? "Not enough history" : peso(result.usualDailyCents)]);

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="label-mono text-muted">You asked</span>
        <p className="rounded-[10px] bg-sand px-3 py-2.5 font-mono text-base break-words">› {typed}</p>
      </div>

      <section aria-label="Answer" className="flex flex-col">
        <Zigzag className="fill-slip" flip />
        <div className="flex flex-col gap-4 bg-slip px-5 pt-3.5 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="label-mono truncate text-muted">{item || "Your purchase"}</span>
              <span className="tabular font-display text-[44px] leading-none font-extrabold tracking-[-0.03em]">
                {formatPeso(priceCents)}
              </span>
            </div>
            <div
              role="img"
              aria-label={`Verdict: ${s.label.toLowerCase()}`}
              className={`mt-0.5 shrink-0 -rotate-[8deg] rounded-[10px] border-[3px] px-3.5 py-1.5 font-display text-[26px] leading-[1.1] font-extrabold tracking-[0.04em] ${s.className}`}
            >
              {s.label}
            </div>
          </div>

          <div className="border-t-[1.5px] border-dashed border-rule" />

          <dl className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 text-[15px]">
            {rows.map(([label, value, big]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className={`tabular m-0 ${big ? "font-display text-xl font-extrabold" : "font-semibold"}`}>{value}</dd>
              </div>
            ))}
          </dl>

          {(result.savingsCents > 0 || result.pendingGigCents > 0 || profile.allowance_weekday === null) && (
            <>
              <div className="border-t-[1.5px] border-dashed border-rule" />
              <ul className="flex flex-col gap-1.5 text-[13px] text-muted">
                {result.savingsCents > 0 && <li>Savings not touched: {formatPeso(result.savingsCents)} stays where it is.</li>}
                {result.pendingGigCents > 0 && <li>Not counted: {peso(result.pendingGigCents)} gig pay that&apos;s still on the way.</li>}
                {profile.allowance_weekday === null && (
                  <li>
                    No allowance day set, so this assumes 7 days.{" "}
                    <Link href="/settings" className="font-semibold underline">
                      Set it
                    </Link>
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
        <Zigzag className="fill-slip" />
      </section>

      <section aria-label="Explanation" className="flex flex-col gap-2 rounded-[20px] bg-ink px-[18px] py-4 text-paper">
        <span className="label-mono text-mango">Sulod&apos;s take · from your numbers</span>
        <p className="text-[15px] leading-relaxed">{text}</p>
      </section>

      <div className="flex gap-2.5">
        <Link
          href={`/add?${new URLSearchParams({ merchant: item, amount: (priceCents / 100).toFixed(2) })}`}
          className="press flex h-14 flex-1 items-center justify-center rounded-2xl border-2 border-ink bg-chili font-display text-[17px] font-bold text-white"
        >
          Log this purchase
        </Link>
        <Link
          href="/afford"
          className="flex h-14 w-[116px] items-center justify-center rounded-2xl border-2 border-ink text-[15px] font-semibold"
        >
          Ask again
        </Link>
      </div>
    </>
  );
}
