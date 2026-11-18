import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { deleteGoal } from "@/app/actions";
import { ConfirmAction } from "@/components/confirm-action";
import { ArrowLeftIcon } from "@/components/icons";
import { getGoal } from "@/lib/data";
import { manilaDayKey } from "@/lib/dates";
import { formatPeso } from "@/lib/money";
import { GoalForm } from "../goal-form";

export default async function EditGoalPage({ params }: PageProps<"/goals/[id]">) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const g = await getGoal(id);
  if (!g) notFound();

  return (
    <main className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <header className="flex items-center gap-3">
        <Link href="/goals" aria-label="Back to goals" className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink">
          <ArrowLeftIcon size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">Edit goal</h1>
      </header>
      <GoalForm
        today={manilaDayKey(new Date())}
        defaults={{
          id: g.id,
          name: g.name,
          target: (g.target_cents / 100).toFixed(2).replace(/\.00$/, ""),
          target_date: g.target_date ?? "",
        }}
      />
      <ConfirmAction
        action={deleteGoal}
        id={g.id}
        label="Delete goal"
        confirmLabel={
          g.saved_cents > 0 ? `Tap again. The ${formatPeso(g.saved_cents)} stays in savings.` : "Tap again to delete"
        }
        pendingLabel="Deleting…"
      />
    </main>
  );
}
