"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Category, TransactionType, WalletBalanceRow } from "@/lib/types";

type Props = {
  month: string;
  type?: TransactionType;
  walletId?: string;
  categoryId?: string;
  wallets: WalletBalanceRow[];
  categories: Category[];
};

const types: { value: TransactionType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "expense", label: "Spent" },
  { value: "income", label: "Received" },
  { value: "transfer", label: "Moved" },
];

const select =
  "h-11 min-w-0 flex-1 rounded-xl border-2 border-ink bg-slip px-2.5 text-sm text-ink disabled:opacity-50";

export function FilterBar({ month, type, walletId, categoryId, wallets, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(next: Partial<Record<"type" | "wallet" | "category", string>>) {
    const params = new URLSearchParams({ month });
    const merged = { type: type ?? "", wallet: walletId ?? "", category: categoryId ?? "", ...next };
    // Category only applies to spending, so drop it when switching to another type.
    if (merged.type && merged.type !== "expense") merged.category = "";
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    startTransition(() => router.replace(`/activity?${params}`, { scroll: false }));
  }

  return (
    <div className="flex flex-col gap-2.5" aria-busy={pending}>
      <div role="group" aria-label="Kind of entry" className="grid grid-cols-4 overflow-hidden rounded-[14px] border-2 border-ink">
        {types.map((t, i) => {
          const active = (type ?? "") === t.value;
          return (
            <button
              key={t.value || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => go({ type: t.value })}
              className={`min-h-11 text-sm ${i > 0 ? "border-l-2 border-ink" : ""} ${
                active ? "bg-ink font-bold text-paper" : "bg-transparent"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="filter-wallet">
          Wallet
        </label>
        <select
          id="filter-wallet"
          className={select}
          value={walletId ?? ""}
          onChange={(e) => go({ wallet: e.target.value })}
        >
          <option value="">All wallets</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filter-category">
          Category
        </label>
        <select
          id="filter-category"
          className={select}
          value={categoryId ?? ""}
          disabled={Boolean(type && type !== "expense")}
          onChange={(e) => go({ category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
