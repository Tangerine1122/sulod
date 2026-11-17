"use client";

import { useActionState, useState, type CSSProperties } from "react";
import { createTransaction, updateTransaction, type FormState } from "@/app/actions";
import { textOn } from "@/lib/color";
import { useFormSubmit } from "@/lib/use-form-submit";
import type { Category, TransactionType, WalletBalanceRow } from "@/lib/types";

/** Values the form starts with. With an `id`, the form edits that entry instead of creating one. */
export type EntryDefaults = {
  id?: string;
  type?: TransactionType;
  amount?: string;
  merchant?: string;
  note?: string;
  date?: string;
  wallet_id?: string;
  transfer_to_wallet_id?: string | null;
  category_id?: string | null;
};

type Props = {
  wallets: WalletBalanceRow[];
  categories: Category[];
  today: string;
  defaults: EntryDefaults;
};

const typeOptions: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Spent" },
  { value: "income", label: "Received" },
  { value: "transfer", label: "Moved" },
];

const chip =
  "flex min-h-10 items-center rounded-full border-[1.5px] border-rule px-3.5 text-sm peer-checked:border-2 peer-checked:border-ink peer-checked:font-bold peer-focus-visible:outline-3 peer-focus-visible:outline-chili";

export function EntryForm({ wallets, categories, today, defaults }: Props) {
  const editing = Boolean(defaults.id);
  const [state, action, pending] = useActionState<FormState, FormData>(
    editing ? updateTransaction : createTransaction,
    {},
  );
  const [type, setType] = useState<TransactionType>(defaults.type ?? "expense");
  const onSubmit = useFormSubmit(action);
  const spendable = wallets.filter((w) => w.counts_as_spendable);
  const defaultWallet = defaults.wallet_id ?? (spendable[0] ?? wallets[0])?.id;
  const defaultTarget =
    defaults.transfer_to_wallet_id ?? wallets.find((w) => !w.counts_as_spendable && w.id !== defaultWallet)?.id;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <fieldset>
        <legend className="sr-only">Kind of entry</legend>
        <div className="grid grid-cols-3 overflow-hidden rounded-[14px] border-2 border-ink">
          {typeOptions.map((o, i) => (
            <label key={o.value} className={`cursor-pointer ${i > 0 ? "border-l-2 border-ink" : ""}`}>
              <input
                type="radio"
                name="type"
                value={o.value}
                checked={type === o.value}
                onChange={() => setType(o.value)}
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center justify-center text-sm peer-checked:bg-ink peer-checked:font-bold peer-checked:text-paper peer-focus-visible:outline-3 peer-focus-visible:-outline-offset-4 peer-focus-visible:outline-chili">
                {o.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="amount" className="label-mono text-muted">
          Amount
        </label>
        <div className="flex h-16 items-center gap-1 rounded-2xl border-2 border-ink bg-slip px-4 shadow-hard focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-chili">
          <span aria-hidden="true" className="font-display text-2xl font-medium text-muted">
            ₱
          </span>
          <input
            id="amount"
            name="amount"
            required
            inputMode="decimal"
            defaultValue={defaults.amount ?? ""}
            placeholder="0.00"
            autoFocus={!defaults.amount}
            className="tabular min-w-0 flex-1 bg-transparent font-display text-[32px] font-extrabold tracking-tight outline-none"
          />
        </div>
      </div>

      {type !== "transfer" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="merchant" className="text-sm text-muted">
            {type === "income" ? "From" : "Where / what"}
          </label>
          <input
            id="merchant"
            name="merchant"
            maxLength={80}
            defaultValue={defaults.merchant ?? ""}
            placeholder={type === "income" ? "Allowance, salary, gig…" : "Jollibee, Grab, photocopy…"}
            className="h-12 rounded-xl border-2 border-ink bg-slip px-3 text-base"
          />
        </div>
      )}

      {type === "expense" && (
        <fieldset className="flex flex-col">
          <legend className="mb-2 text-sm text-muted">Category</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <label key={c.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="category_id"
                  value={c.id}
                  defaultChecked={c.id === defaults.category_id}
                  className="peer sr-only"
                />
                <span
                  className={`${chip} peer-checked:bg-(--chip) peer-checked:text-(--chip-text)`}
                  style={{ "--chip": c.color, "--chip-text": textOn(c.color) } as CSSProperties}
                >
                  <span className="mr-2 size-2.5 rounded-[3px] border border-ink" style={{ background: c.color }} />
                  {c.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="flex flex-col">
        <legend className="mb-2 text-sm text-muted">
          {type === "expense" ? "Paid from" : type === "income" ? "Went into" : "From"}
        </legend>
        <div className="flex flex-wrap gap-2">
          {wallets.map((w) => (
            <label key={w.id} className="cursor-pointer">
              <input
                type="radio"
                name="wallet_id"
                value={w.id}
                defaultChecked={w.id === defaultWallet}
                className="peer sr-only"
              />
              <span className={`${chip} rounded-[10px] peer-checked:bg-ink peer-checked:text-paper`}>{w.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {type === "transfer" && (
        <fieldset className="flex flex-col">
          <legend className="mb-2 text-sm text-muted">To</legend>
          <div className="flex flex-wrap gap-2">
            {wallets.map((w) => (
              <label key={w.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="transfer_to_wallet_id"
                  value={w.id}
                  defaultChecked={w.id === defaultTarget}
                  className="peer sr-only"
                />
                <span className={`${chip} rounded-[10px] peer-checked:bg-mango`}>{w.name}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Moving money between your own wallets never counts as spending.</p>
        </fieldset>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="text-sm text-muted">
            When
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={defaults.date ?? today}
            max={today}
            className="h-12 rounded-xl border-2 border-ink bg-slip px-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className="text-sm text-muted">
            Note <span className="text-xs">(optional)</span>
          </label>
          <input id="note" name="note" maxLength={200} defaultValue={defaults.note ?? ""} className="h-12 rounded-xl border-2 border-ink bg-slip px-3 text-base" />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-semibold text-chili">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="press h-14 rounded-2xl border-2 border-ink bg-chili font-display text-lg font-bold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : editing ? "Save changes" : "Save it"}
      </button>
    </form>
  );
}
