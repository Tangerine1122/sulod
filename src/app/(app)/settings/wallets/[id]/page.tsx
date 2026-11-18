import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { archiveWallet, deleteWallet, restoreWallet } from "@/app/actions";
import { ConfirmAction } from "@/components/confirm-action";
import { ArrowLeftIcon } from "@/components/icons";
import { getWallet } from "@/lib/data";
import { formatPeso } from "@/lib/money";
import { WalletEditForm } from "./wallet-edit-form";

export default async function EditWalletPage({ params }: PageProps<"/settings/wallets/[id]">) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const w = await getWallet(id);
  if (!w) notFound();

  const entries = `${w.entry_count} ${w.entry_count === 1 ? "entry" : "entries"}`;

  return (
    <main className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <header className="flex items-center gap-3">
        <Link href="/settings" aria-label="Back to settings" className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink">
          <ArrowLeftIcon size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="min-w-0 truncate font-display text-[26px] font-extrabold tracking-[-0.02em]">{w.name}</h1>
      </header>

      {w.archived ? (
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-slip p-4">
          <span className="label-mono text-muted">Archived</span>
          <p>
            This wallet is hidden from Home, the entry form and your balances. Its {entries} still show in Activity and still count in
            your spending.
          </p>
          <form action={restoreWallet}>
            <input type="hidden" name="id" value={w.id} />
            <button type="submit" className="press h-12 w-full rounded-xl border-2 border-ink bg-mango font-display font-bold">
              Restore wallet
            </button>
          </form>
        </section>
      ) : (
        <>
          <WalletEditForm
            id={w.id}
            name={w.name}
            type={w.type}
            balance={((w.balance_cents ?? 0) / 100).toFixed(2).replace(/\.00$/, "")}
          />

          {w.entry_count === 0 ? (
            <ConfirmAction action={deleteWallet} id={w.id} label="Delete wallet" confirmLabel="Tap again to delete" pendingLabel="Deleting…" />
          ) : (
            <div className="flex flex-col gap-2">
              <ConfirmAction
                action={archiveWallet}
                id={w.id}
                tone="plain"
                label="Archive wallet"
                confirmLabel="Tap again to archive"
                pendingLabel="Archiving…"
              />
              <p className="text-xs text-muted">
                It has {entries}, so it can&apos;t be deleted without changing your history. Archiving hides it and keeps its entries.
                {(w.balance_cents ?? 0) !== 0 &&
                  ` Its ${formatPeso(w.balance_cents ?? 0)} balance will drop out of your totals, so set the balance to 0 first if the money moved elsewhere.`}
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
