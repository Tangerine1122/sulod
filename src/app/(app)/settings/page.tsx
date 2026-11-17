import Link from "next/link";
import { signOut } from "@/app/actions";
import { AllowanceDayForm } from "@/components/allowance-day-form";
import { ArrowLeftIcon } from "@/components/icons";
import { WalletForm } from "@/components/wallet-form";
import { getProfile, getWalletBalances } from "@/lib/data";
import { formatPeso } from "@/lib/money";

const typeLabel = { cash: "Cash", debit: "Debit", ewallet: "E-wallet", savings: "Savings" } as const;

export default async function SettingsPage() {
  const [profile, wallets] = await Promise.all([getProfile(), getWalletBalances()]);

  return (
    <main className="flex flex-col gap-7 px-4 pt-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink"
        >
          <ArrowLeftIcon size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">Settings</h1>
      </header>

      <section aria-labelledby="wallets" className="flex flex-col gap-3">
        <h2 id="wallets" className="font-display text-lg font-bold">
          Wallets
        </h2>
        {wallets.length > 0 && (
          <ul className="flex flex-col rounded-2xl border-2 border-ink bg-slip px-4">
            {wallets.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 border-b border-dashed border-rule py-3 last:border-b-0">
                <div className="flex flex-col">
                  <span className="font-semibold">{w.name}</span>
                  <span className="text-xs text-muted">
                    {typeLabel[w.type]}
                    {w.counts_as_spendable ? "" : " · not in safe to spend"}
                  </span>
                </div>
                <span className="tabular font-display font-bold">{formatPeso(w.balance_cents)}</span>
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-2xl border-2 border-dashed border-ink p-4 open:border-solid open:bg-slip">
          <summary className="cursor-pointer font-display font-bold">Add a wallet</summary>
          <div className="pt-4">
            <WalletForm />
          </div>
        </details>
      </section>

      <section aria-labelledby="allowance" className="flex flex-col gap-3">
        <h2 id="allowance" className="font-display text-lg font-bold">
          Allowance
        </h2>
        <AllowanceDayForm current={profile.allowance_weekday} />
        <p className="text-xs text-muted">Used for &ldquo;safe to spend today&rdquo; on Home.</p>
      </section>

      <form action={signOut}>
        <button type="submit" className="h-12 w-full rounded-xl border-2 border-ink text-sm font-semibold">
          Sign out
        </button>
      </form>
    </main>
  );
}
