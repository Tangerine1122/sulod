import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import { getCategories, getWalletBalances } from "@/lib/data";
import { manilaParts } from "@/lib/dates";
import { roughParse } from "@/lib/rough-parse";
import { EntryForm } from "./entry-form";

export default async function AddPage({ searchParams }: PageProps<"/add">) {
  const { q } = await searchParams;
  await connection();
  const typed = typeof q === "string" ? q : "";
  const [wallets, categories] = await Promise.all([getWalletBalances(), getCategories()]);
  if (wallets.length === 0) redirect("/");

  const { y, m, d } = manilaParts(new Date());
  const today = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

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
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">New entry</h1>
      </header>

      {typed && (
        <div className="flex flex-col gap-1">
          <span className="label-mono text-muted">You typed</span>
          <p className="rounded-[10px] bg-sand px-3 py-2.5 font-mono text-base">› {typed}</p>
        </div>
      )}

      <EntryForm wallets={wallets} categories={categories} today={today} prefill={roughParse(typed)} />
    </main>
  );
}
