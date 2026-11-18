"use client";

import { useActionState } from "react";
import { updateWallet, type FormState } from "@/app/actions";
import { useFormSubmit } from "@/lib/use-form-submit";
import type { WalletType } from "@/lib/types";

const types: { value: WalletType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "debit", label: "Debit" },
  { value: "ewallet", label: "E-wallet" },
  { value: "savings", label: "Savings" },
];

export function WalletEditForm({ id, name, type, balance }: { id: string; name: string; type: WalletType; balance: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateWallet, {});
  const onSubmit = useFormSubmit(action);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="wallet-name" className="text-sm text-muted">
          Name
        </label>
        <input
          id="wallet-name"
          name="name"
          required
          maxLength={40}
          defaultValue={name}
          className="h-12 rounded-xl border-2 border-ink bg-slip px-3 text-base"
        />
      </div>

      <fieldset className="flex flex-col">
        <legend className="mb-2 text-sm text-muted">Type</legend>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <label key={t.value} className="cursor-pointer">
              <input type="radio" name="type" value={t.value} defaultChecked={t.value === type} className="peer sr-only" />
              <span className="flex min-h-11 items-center rounded-full border-[1.5px] border-rule px-4 text-sm peer-checked:border-2 peer-checked:border-ink peer-checked:bg-mango peer-checked:font-bold peer-focus-visible:outline-3 peer-focus-visible:outline-chili">
                {t.label}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Savings wallets are left out of &ldquo;safe to spend&rdquo; and hold your goals.</p>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wallet-balance" className="text-sm text-muted">
          Balance right now
        </label>
        <div className="flex h-12 items-center gap-2 rounded-xl border-2 border-ink bg-slip px-3 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-chili">
          <span aria-hidden="true" className="font-display font-bold text-muted">
            ₱
          </span>
          <input
            id="wallet-balance"
            name="balance"
            required
            inputMode="decimal"
            defaultValue={balance}
            className="tabular min-w-0 flex-1 bg-transparent font-mono text-base outline-none"
          />
        </div>
        <p className="text-xs text-muted">
          If this doesn&apos;t match your real account, type the real amount. Your past entries stay as they are.
        </p>
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
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
