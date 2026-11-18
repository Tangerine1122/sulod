"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { markGigPaid, type FormState } from "@/app/actions";
import { formatPeso } from "@/lib/money";
import type { Gig, WalletBalanceRow } from "@/lib/types";
import { useFormSubmit } from "@/lib/use-form-submit";

type Props = {
  gig: Gig;
  wallets: WalletBalanceRow[];
  today: string;
  /** "FRI", "13", "NOV" for the date block, and the long detail line. */
  dateBlock: { weekday: string; day: string; month: string };
  detail: string;
};

const chip =
  "flex min-h-10 items-center rounded-[10px] border-[1.5px] border-rule px-3.5 text-sm peer-checked:border-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:font-bold peer-checked:text-paper peer-focus-visible:outline-3 peer-focus-visible:outline-chili";

/** A shift still waiting for pay. "Mark paid" opens a small form right inside the card. */
export function PendingGig({ gig, wallets, today, dateBlock, detail }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(markGigPaid, {});
  const onSubmit = useFormSubmit(action);
  // Pay usually lands in an e-wallet or bank, not cash or savings.
  const suggested =
    wallets.find((w) => w.type === "ewallet") ?? wallets.find((w) => w.counts_as_spendable) ?? wallets[0];
  const amount = (gig.expected_cents / 100).toFixed(2).replace(/\.00$/, "");

  return (
    <article className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-slip p-3">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex w-12 shrink-0 flex-col items-center border-r-[1.5px] border-dashed border-rule pr-3 font-mono"
        >
          <span className="text-[11px] text-muted">{dateBlock.weekday}</span>
          <span className="text-[22px] leading-[1.1] font-medium">{dateBlock.day}</span>
          <span className="text-[11px] text-muted">{dateBlock.month}</span>
        </div>
        <Link href={`/gigs/${gig.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-semibold">{gig.title}</span>
          <span className="truncate text-xs text-muted">{detail}</span>
          <span className="tabular font-display text-lg font-bold">{formatPeso(gig.expected_cents, { whole: gig.expected_cents % 100 === 0 })}</span>
        </Link>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            className="min-h-11 shrink-0 rounded-xl border-2 border-ink bg-ink px-3 text-[13px] font-bold text-paper"
          >
            Mark paid
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t-[1.5px] border-dashed border-rule pt-3">
          <input type="hidden" name="id" value={gig.id} />
          <fieldset className="flex flex-col">
            <legend className="mb-2 text-sm text-muted">Went into</legend>
            <div className="flex flex-wrap gap-2">
              {wallets.map((w) => (
                <label key={w.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="wallet_id"
                    value={w.id}
                    defaultChecked={w.id === suggested?.id}
                    className="peer sr-only"
                  />
                  <span className={chip}>{w.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`paid-amount-${gig.id}`} className="text-sm text-muted">
                Amount received
              </label>
              <div className="flex h-11 items-center gap-1 rounded-xl border-2 border-ink bg-paper px-2.5 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-chili">
                <span aria-hidden="true" className="font-display font-bold text-muted">
                  ₱
                </span>
                <input
                  id={`paid-amount-${gig.id}`}
                  name="amount"
                  required
                  inputMode="decimal"
                  defaultValue={amount}
                  className="tabular min-w-0 flex-1 bg-transparent font-mono text-base outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`paid-date-${gig.id}`} className="text-sm text-muted">
                Paid on
              </label>
              <input
                id={`paid-date-${gig.id}`}
                name="date"
                type="date"
                required
                defaultValue={today}
                max={today}
                className="h-11 rounded-xl border-2 border-ink bg-paper px-2.5 text-base"
              />
            </div>
          </div>
          {state.error && (
            <p role="alert" className="text-sm font-semibold text-chili">
              {state.error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="press h-12 flex-1 rounded-xl border-2 border-ink bg-dagat font-display font-bold text-paper disabled:opacity-60"
            >
              {pending ? "Saving…" : "Got paid"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-12 rounded-xl border-2 border-ink px-4 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
