import Link from "next/link";
import { signOut } from "@/app/actions";
import { AllowanceDayForm } from "@/components/allowance-day-form";
import { ArrowLeftIcon, PlusIcon } from "@/components/icons";
import { WalletForm } from "@/components/wallet-form";
import { connection } from "next/server";
import { getArchivedWallets, getCategories, getProfile, getWalletBalances } from "@/lib/data";
import { formatPeso } from "@/lib/money";

const typeLabel = { cash: "Cash", debit: "Debit", ewallet: "E-wallet", savings: "Savings" } as const;

export default async function SettingsPage() {
  await connection();
  const [profile, wallets, archived, categories] = await Promise.all([
    getProfile(),
    getWalletBalances(),
    getArchivedWallets(),
    getCategories(),
  ]);

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
              <li key={w.id} className="border-b border-dashed border-rule last:border-b-0">
                <Link href={`/settings/wallets/${w.id}`} className="flex min-h-14 items-center justify-between gap-3 py-3 hover:text-chili">
                  <span className="flex flex-col">
                    <span className="font-semibold">{w.name}</span>
                    <span className="text-xs text-muted">
                      {typeLabel[w.type]}
                      {w.counts_as_spendable ? "" : " · not in safe to spend"}
                    </span>
                  </span>
                  <span className="tabular font-display font-bold">{formatPeso(w.balance_cents)}</span>
                </Link>
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
        {archived.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-muted">Archived wallets ({archived.length})</summary>
            <ul className="mt-2 flex flex-col">
              {archived.map((w) => (
                <li key={w.id}>
                  <Link href={`/settings/wallets/${w.id}`} className="flex min-h-11 items-center justify-between border-b border-dashed border-rule py-2">
                    <span>{w.name}</span>
                    <span className="text-xs text-muted">{typeLabel[w.type]} · restore</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="text-xs text-muted">Tap a wallet to rename it, change its type or fix its balance.</p>
      </section>

      <section aria-labelledby="categories" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="categories" className="font-display text-lg font-bold">
            Categories
          </h2>
          <Link href="/settings/categories/new" className="flex min-h-11 items-center gap-1.5 text-sm font-semibold hover:text-chili">
            <PlusIcon size={16} strokeWidth={2.5} />
            Add
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/settings/categories/${c.id}`}
                className="flex min-h-12 items-center gap-2.5 rounded-xl border-[1.5px] border-ink bg-slip px-3 hover:border-2"
              >
                <span aria-hidden="true" className="size-4 shrink-0 rounded-[4px] border border-ink" style={{ background: c.color }} />
                <span className="truncate text-sm font-semibold">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
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
