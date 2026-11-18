import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { deleteTransaction } from "@/app/actions";
import { ConfirmAction } from "@/components/confirm-action";
import { ArrowLeftIcon } from "@/components/icons";
import { getCategories, getTransaction, getWalletBalances } from "@/lib/data";
import { formatManila, manilaDayKey } from "@/lib/dates";
import { EntryForm } from "../../add/entry-form";

export default async function EditEntryPage({ params }: PageProps<"/activity/[id]">) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [t, wallets, categories] = await Promise.all([getTransaction(id), getWalletBalances(), getCategories()]);
  if (!t) notFound();

  return (
    <main className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href="/activity"
          aria-label="Back to activity"
          className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink"
        >
          <ArrowLeftIcon size={20} strokeWidth={2.2} />
        </Link>
        <div className="flex flex-col">
          <h1 className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.02em]">Edit entry</h1>
          <span className="text-xs text-muted">
            Logged {formatManila(t.occurred_at, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
      </header>

      <EntryForm
        wallets={wallets}
        categories={categories}
        today={manilaDayKey(new Date())}
        defaults={{
          id: t.id,
          type: t.type,
          // Plain number for the input: 120050 -> "1200.50"
          amount: (t.amount_cents / 100).toFixed(2),
          merchant: t.merchant ?? "",
          note: t.note ?? "",
          date: manilaDayKey(t.occurred_at),
          wallet_id: t.wallet_id,
          transfer_to_wallet_id: t.transfer_to_wallet_id,
          category_id: t.category_id,
        }}
      />

      <ConfirmAction
        action={deleteTransaction}
        id={t.id}
        label="Delete entry"
        confirmLabel="Tap again to delete"
        pendingLabel="Deleting…"
      />
    </main>
  );
}
