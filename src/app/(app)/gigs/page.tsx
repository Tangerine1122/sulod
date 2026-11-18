import Link from "next/link";
import { connection } from "next/server";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { getGigs, getWalletBalances } from "@/lib/data";
import { formatDayKey, formatManila, manilaDayKey } from "@/lib/dates";
import { formatPeso } from "@/lib/money";
import type { Gig } from "@/lib/types";
import { PendingGig } from "./pending-gig";

const hoursLabel = (h: number | null) => (h === null ? "" : ` · ${h} ${h === 1 ? "hr" : "hrs"}`);

export default async function GigsPage() {
  await connection();
  const now = new Date();
  const today = manilaDayKey(now);
  const [gigs, wallets] = await Promise.all([getGigs(now), getWalletBalances()]);
  const monthName = formatManila(now, { month: "short" });
  const isEmpty = gigs.pending.length === 0 && gigs.paid.length === 0;

  return (
    <main className="flex flex-col gap-5 px-4 pt-5 pb-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[30px] font-extrabold tracking-[-0.02em]">Gig pay</h1>
        <Link
          href="/gigs/new"
          className="press flex min-h-11 items-center gap-2 rounded-[14px] border-2 border-ink bg-slip px-3.5 text-sm font-bold"
        >
          <PlusIcon size={18} strokeWidth={2.5} />
          Log a shift
        </Link>
      </header>

      <section aria-label="Totals" className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-ink bg-mango p-3.5 shadow-hard">
          <span className="label-mono">Waiting on</span>
          <span className="tabular font-display text-[28px] font-extrabold tracking-tight">
            {formatPeso(gigs.pendingCents, { whole: true })}
          </span>
          <span className="text-[13px] font-semibold">
            {gigs.pending.length} {gigs.pending.length === 1 ? "shift" : "shifts"}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border-[1.5px] border-dashed border-muted p-3.5">
          <span className="label-mono text-muted">Paid in {monthName}</span>
          <span className="tabular font-display text-[28px] font-bold tracking-tight text-dagat">
            {formatPeso(gigs.paidThisMonthCents, { whole: true })}
          </span>
          <span className="text-[13px] text-muted">
            {gigs.paidThisMonthCount} {gigs.paidThisMonthCount === 1 ? "shift" : "shifts"}
          </span>
        </div>
      </section>

      {isEmpty ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border-[1.5px] border-dashed border-muted p-5">
          <p className="font-semibold">No shifts yet.</p>
          <p className="text-sm text-muted">
            Log a shift after each event. It stays here as &ldquo;waiting on&rdquo; until the pay lands, then one tap adds it to your wallet.
          </p>
        </div>
      ) : (
        <>
          <section aria-labelledby="waiting" className="flex flex-col gap-2.5">
            <h2 id="waiting" className="font-display text-lg font-bold">
              Waiting to be paid
            </h2>
            {gigs.pending.length === 0 ? (
              <p className="text-sm text-muted">Nothing owed. Every shift is paid.</p>
            ) : (
              gigs.pending.map((g) => (
                <PendingGig
                  key={g.id}
                  gig={g}
                  wallets={wallets}
                  today={today}
                  dateBlock={{
                    weekday: formatDayKey(g.work_date, { weekday: "short" }).toUpperCase(),
                    day: formatDayKey(g.work_date, { day: "numeric" }),
                    month: formatDayKey(g.work_date, { month: "short" }).toUpperCase(),
                  }}
                  detail={`${formatDayKey(g.work_date, { weekday: "short", month: "short", day: "numeric" })}${hoursLabel(g.hours)}${
                    g.work_date > today ? " · upcoming" : ""
                  }`}
                />
              ))
            )}
          </section>

          {gigs.paid.length > 0 && (
            <section aria-labelledby="paid" className="flex flex-col gap-1">
              <h2 id="paid" className="font-display text-lg font-bold">
                Paid
              </h2>
              <ul className="flex flex-col">
                {gigs.paid.map((g) => (
                  <PaidRow key={g.id} g={g} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="text-[13px] text-muted">
        Marking a shift paid adds it as income to the wallet you choose. Pay you&apos;re still waiting on never counts toward your balance or safe to spend.
      </p>
    </main>
  );
}

function PaidRow({ g }: { g: Gig }) {
  const paid = g.paid_cents ?? g.expected_cents;
  const paidOn = g.paid_at ? formatManila(g.paid_at, { month: "short", day: "numeric" }) : "";
  return (
    <li className="border-b border-dashed border-rule last:border-b-0">
      <Link href={`/gigs/${g.id}`} className="flex min-h-14 items-center gap-3 py-2.5 hover:bg-sand/40">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-dagat-soft text-dagat">
          <CheckIcon size={18} strokeWidth={2.5} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate font-semibold">
            {g.title}
            {hoursLabel(g.hours)}
          </span>
          <span className="truncate text-xs text-muted">
            {formatDayKey(g.work_date, { weekday: "short", month: "short", day: "numeric" })} · paid {paidOn}
            {g.wallet_name ? ` to ${g.wallet_name}` : ""}
          </span>
        </span>
        <span className="tabular font-display font-bold text-dagat">+{formatPeso(paid, { whole: paid % 100 === 0 })}</span>
      </Link>
    </li>
  );
}
