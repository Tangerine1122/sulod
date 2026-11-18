import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeftIcon } from "@/components/icons";
import { manilaDayKey } from "@/lib/dates";
import { GoalForm } from "../goal-form";

export default async function NewGoalPage() {
  await connection();
  return (
    <main className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <header className="flex items-center gap-3">
        <Link href="/goals" aria-label="Back to goals" className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink">
          <ArrowLeftIcon size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">New goal</h1>
      </header>
      <GoalForm defaults={{}} today={manilaDayKey(new Date())} />
    </main>
  );
}
