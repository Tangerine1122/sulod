import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import { getCategories, getWalletBalances } from "@/lib/data";
import { manilaDayKey } from "@/lib/dates";
import { MAX_INPUT, quickAdd, type QuickAddResult } from "@/lib/quick-add";
import { EntryForm, type EntryDefaults } from "./entry-form";

export default async function AddPage({ searchParams }: PageProps<"/add">) {
  const { q } = await searchParams;
  await connection();
  const typed = typeof q === "string" ? q.trim().slice(0, MAX_INPUT) : "";
  const [wallets, categories] = await Promise.all([getWalletBalances(), getCategories()]);
  if (wallets.length === 0) redirect("/");

  const now = new Date();
  const result = typed ? await quickAdd(typed, { now, wallets, categories }) : null;

  const defaults: EntryDefaults = result
    ? {
        ...result.defaults,
        askCategory: result.via === "ai" && result.isEntry && result.askCategory,
        ai: result.via === "ai" && result.isEntry ? { confidence: result.confidence ?? 0, raw: typed } : undefined,
      }
    : {};

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
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">
          {result ? "Check before I save" : "New entry"}
        </h1>
      </header>

      {typed && result && <TypedLine typed={typed} result={result} />}

      <EntryForm wallets={wallets} categories={categories} today={manilaDayKey(now)} defaults={defaults} />
    </main>
  );
}

function TypedLine({ typed, result }: { typed: string; result: QuickAddResult }) {
  const percent = result.confidence === null ? null : Math.round(result.confidence * 100);
  const showStamp = result.via === "ai" && result.isEntry && !result.askCategory && percent !== null;

  let message: string | null = null;
  if (result.via === "fallback") {
    message = "Couldn't reach the AI just now, so only the amount and name are filled in.";
  } else if (!result.isEntry) {
    message = "That doesn't look like an entry with an amount. Fill it in below.";
  } else if (result.askCategory) {
    message = "Not sure about the category. Pick one below.";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="label-mono text-muted">You typed</span>
          <p className="rounded-[10px] bg-sand px-3 py-2.5 font-mono text-base break-words">› {typed}</p>
        </div>
        {showStamp && (
          <div
            role="img"
            aria-label={`Sulod is ${percent}% sure`}
            className="flex shrink-0 -rotate-[8deg] flex-col items-center rounded-[10px] border-[2.5px] border-dagat px-2.5 py-1.5 font-mono leading-[1.1] text-dagat"
          >
            <span className="text-xl font-medium">{percent}%</span>
            <span className="text-[11px] tracking-[0.08em] uppercase">sure</span>
          </div>
        )}
      </div>
      {message && (
        <p role="status" className="text-sm font-semibold text-chili">
          {message}
        </p>
      )}
    </div>
  );
}
