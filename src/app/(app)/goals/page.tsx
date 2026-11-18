import Link from "next/link";
import { connection } from "next/server";
import { PlusIcon, TransferIcon } from "@/components/icons";
import { Zigzag } from "@/components/zigzag";
import { getGoals, getWalletBalances } from "@/lib/data";
import { formatDayKey } from "@/lib/dates";
import { goalMath, unassignedSavings } from "@/lib/goals";
import { formatPeso } from "@/lib/money";
import { GoalCard } from "./goal-card";

export default async function GoalsPage() {
  await connection();
  const now = new Date();
  const [goals, wallets] = await Promise.all([getGoals(), getWalletBalances()]);
  const savingsWallets = wallets.filter((w) => !w.counts_as_spendable);
  const savingsCents = savingsWallets.reduce((s, w) => s + w.balance_cents, 0);
  const free = unassignedSavings(savingsCents, goals);
  const savingsTarget = savingsWallets[0];

  return (
    <main className="flex flex-col gap-[22px] px-4 pt-5 pb-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[30px] font-extrabold tracking-[-0.02em]">Goals</h1>
        {savingsTarget && (
          <Link
            href={`/add?${new URLSearchParams({ type: "transfer", to: savingsTarget.id })}`}
            className="press flex min-h-11 items-center gap-2 rounded-[14px] border-2 border-ink bg-slip px-3.5 text-sm font-bold"
          >
            <TransferIcon size={18} />
            Move money
          </Link>
        )}
      </header>

      {savingsWallets.length === 0 ? (
        <section className="flex flex-col items-start gap-3 rounded-2xl border-2 border-ink bg-slip p-5">
          <span className="label-mono text-muted">First, a savings wallet</span>
          <p>
            Goals are set aside from your savings. Add a wallet with the type <strong>Savings</strong> (like GoTyme Savings), then come back.
          </p>
          <Link href="/settings" className="font-semibold underline">
            Add a savings wallet
          </Link>
        </section>
      ) : (
        <section aria-label="Savings" className="flex flex-col">
          <div className="flex flex-col gap-1.5 rounded-t-[22px] border-2 border-b-0 border-ink bg-mango px-5 py-[18px]">
            <span className="label-mono">{savingsWallets.length === 1 ? savingsWallets[0].name : "All savings"}</span>
            <span className="tabular font-display text-[44px] leading-none font-extrabold tracking-[-0.03em]">
              {formatPeso(savingsCents)}
            </span>
            {free >= 0 ? (
              <span className="text-sm font-semibold">
                {goals.length === 0 ? "Add a goal to start setting money aside." : `${formatPeso(free)} not set aside for a goal yet`}
              </span>
            ) : (
              <span role="alert" className="text-sm font-semibold">
                Your goals add up to {formatPeso(-free)} more than you have saved. Take some out of a goal, or move money into savings.
              </span>
            )}
          </div>
          <Zigzag className="fill-mango stroke-ink stroke-[1.5]" />
        </section>
      )}

      {goals.map((g) => {
        const m = goalMath(g, now);
        const when = m.done
          ? "Done"
          : m.overdue
            ? "Date passed"
            : g.target_date
              ? `by ${formatDayKey(g.target_date, { month: "short", day: "numeric", year: "numeric" })}`
              : "No deadline";
        const hint =
          m.weeklyCents !== null
            ? `To make it on time, set aside about ${formatPeso(m.weeklyCents, { whole: true })} a week${m.weeksLeft === 1 ? " (this week)" : ` for ${m.weeksLeft} weeks`}.`
            : m.overdue
              ? `${formatPeso(m.remainingCents, { whole: true })} still to go. Pick a new date to get a weekly amount.`
              : null;
        return <GoalCard key={g.id} goal={g} percent={m.percent} when={when} hint={hint} done={m.done} />;
      })}

      <Link
        href="/goals/new"
        className="flex min-h-14 items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-ink font-display text-base font-bold"
      >
        <PlusIcon size={18} strokeWidth={2.5} />
        New goal
      </Link>
    </main>
  );
}
