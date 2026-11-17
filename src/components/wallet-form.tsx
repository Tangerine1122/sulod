"use client";

import { useActionState, useEffect, useRef } from "react";
import { createWallet, type FormState } from "@/app/actions";

const types = [
  { value: "cash", label: "Cash" },
  { value: "debit", label: "Debit" },
  { value: "ewallet", label: "E-wallet" },
  { value: "savings", label: "Savings" },
] as const;

export function WalletForm({ submitLabel = "Add wallet" }: { submitLabel?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createWallet, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="wallet-name" className="text-sm text-muted">
          Name
        </label>
        <input
          id="wallet-name"
          name="name"
          required
          maxLength={40}
          placeholder="Landbank, GoTyme, Cash…"
          className="h-12 rounded-xl border-2 border-ink bg-slip px-3 text-base outline-none"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm text-muted">Type</legend>
        <div className="flex flex-wrap gap-2">
          {types.map((t, i) => (
            <label key={t.value} className="cursor-pointer">
              <input type="radio" name="type" value={t.value} defaultChecked={i === 0} className="peer sr-only" />
              <span className="flex min-h-11 items-center rounded-full border-[1.5px] border-rule px-4 text-sm peer-checked:border-2 peer-checked:border-ink peer-checked:bg-mango peer-checked:font-bold peer-focus-visible:outline-3 peer-focus-visible:outline-chili">
                {t.label}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">Savings wallets are left out of &ldquo;safe to spend&rdquo;.</p>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wallet-balance" className="text-sm text-muted">
          How much is in it right now?
        </label>
        <div className="flex h-12 items-center gap-2 rounded-xl border-2 border-ink bg-slip px-3">
          <span aria-hidden="true" className="font-display font-bold text-muted">
            ₱
          </span>
          <input
            id="wallet-balance"
            name="starting_balance"
            inputMode="decimal"
            placeholder="0.00"
            className="tabular min-w-0 flex-1 bg-transparent font-mono text-base outline-none"
          />
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
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
