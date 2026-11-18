import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { deleteGig, undoGigPaid } from "@/app/actions";
import { ConfirmAction } from "@/components/confirm-action";
import { ArrowLeftIcon } from "@/components/icons";
import { getGig } from "@/lib/data";
import { formatManila, manilaDayKey } from "@/lib/dates";
import { formatPeso } from "@/lib/money";
import { GigForm } from "../gig-form";

export default async function EditGigPage({ params }: PageProps<"/gigs/[id]">) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const g = await getGig(id);
  if (!g) notFound();

  const paid = g.status === "paid";
  const paidCents = g.paid_cents ?? g.expected_cents;

  return (
    <main className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href="/gigs"
          aria-label="Back to gig pay"
          className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink"
        >
          <ArrowLeftIcon size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">Edit shift</h1>
      </header>

      {paid && (
        <div role="status" className="flex flex-col gap-1 rounded-2xl border-2 border-ink bg-dagat-soft p-4">
          <span className="label-mono text-dagat">Paid</span>
          <p className="text-base">
            <strong className="tabular">{formatPeso(paidCents)}</strong> went into {g.wallet_name ?? "a wallet"} on{" "}
            {g.paid_at ? formatManila(g.paid_at, { month: "short", day: "numeric" }) : "—"}.
          </p>
          <p className="text-xs text-muted">To change the amount received, edit its income entry in Activity.</p>
        </div>
      )}

      <GigForm
        today={manilaDayKey(new Date())}
        defaults={{
          id: g.id,
          title: g.title,
          work_date: g.work_date,
          hours: g.hours === null ? "" : String(g.hours),
          expected: (g.expected_cents / 100).toFixed(2).replace(/\.00$/, ""),
        }}
      />

      <div className="flex flex-col gap-2.5">
        {paid && (
          <ConfirmAction
            action={undoGigPaid}
            id={g.id}
            tone="plain"
            label="Not paid after all"
            confirmLabel={`Tap again to remove the ${formatPeso(paidCents)} income`}
            pendingLabel="Undoing…"
          />
        )}
        <ConfirmAction
          action={deleteGig}
          id={g.id}
          label="Delete shift"
          confirmLabel={paid ? `Tap again: deletes the shift and its ${formatPeso(paidCents)} income` : "Tap again to delete"}
          pendingLabel="Deleting…"
        />
      </div>
    </main>
  );
}
