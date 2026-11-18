"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { adjustGoal, type FormState } from "@/app/actions";
import { formatPeso } from "@/lib/money";
import type { Goal } from "@/lib/types";
import { useFormSubmit } from "@/lib/use-form-submit";

type Props = {
  goal: Goal;
  percent: number;
  /** "by Jun 2027", "No deadline", "Done", "Date passed" */
  when: string;
  /** e.g. "Set aside about ₱1,063 a week to make it." */
  hint: string | null;
  done: boolean;
};

const TICKS = 20;

export function GoalCard({ goal, percent, when, hint, done }: Props) {
  const [mode, setMode] = useState<"add" | "remove" | null>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(adjustGoal, {});
  const onSubmit = useFormSubmit(action);
  // Any money set aside shows at least one tick, so 2% never looks like nothing.
  const filled = goal.saved_cents > 0 ? Math.max(1, Math.round((percent / 100) * TICKS)) : 0;

  // Close the little form once a save succeeds (adjusting state during render, not in an effect).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.ok) setMode(null);
  }

  return (
    <article className="flex flex-col gap-3 rounded-[18px] border-2 border-ink bg-slip p-4">
      <div className="flex items-baseline justify-between gap-3">
        <Link href={`/goals/${goal.id}`} className="min-w-0 truncate font-display text-xl font-bold hover:text-chili">
          {goal.name}
        </Link>
        <span className={`shrink-0 font-mono text-[13px] font-medium ${done ? "text-dagat" : ""}`}>{percent}%</span>
      </div>

      <div
        role="img"
        aria-label={`${formatPeso(goal.saved_cents)} of ${formatPeso(goal.target_cents)} set aside, ${percent}%`}
        className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[3px]"
      >
        {Array.from({ length: TICKS }, (_, i) =>
          i < filled ? (
            <span key={i} className="h-[22px] rounded-[4px] bg-dagat" />
          ) : (
            <span key={i} className="h-[22px] rounded-[4px] border-[1.5px] border-dashed border-rule" />
          ),
        )}
      </div>

      <div className="flex justify-between gap-3 text-sm">
        <span className="tabular">
          <strong>{formatPeso(goal.saved_cents)}</strong> <span className="text-muted">of {formatPeso(goal.target_cents, { whole: true })}</span>
        </span>
        <span className="text-muted">{when}</span>
      </div>

      {hint && <p className="rounded-[10px] bg-paper px-3 py-2.5 text-[13px]">{hint}</p>}

      {mode === null ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("add")}
            className="h-11 flex-1 rounded-xl border-2 border-ink bg-ink text-sm font-bold text-paper"
          >
            Set aside
          </button>
          {goal.saved_cents > 0 && (
            <button
              type="button"
              onClick={() => setMode("remove")}
              className="h-11 flex-1 rounded-xl border-2 border-ink text-sm font-semibold"
            >
              Take out
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-2 border-t-[1.5px] border-dashed border-rule pt-3">
          <input type="hidden" name="id" value={goal.id} />
          <input type="hidden" name="direction" value={mode} />
          <label htmlFor={`goal-amount-${goal.id}`} className="text-sm text-muted">
            {mode === "add" ? "How much to set aside from savings?" : "How much to take back out?"}
          </label>
          <div className="flex gap-2">
            <div className="flex h-11 min-w-0 flex-1 items-center gap-1 rounded-xl border-2 border-ink bg-paper px-2.5 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-chili">
              <span aria-hidden="true" className="font-display font-bold text-muted">
                ₱
              </span>
              <input
                id={`goal-amount-${goal.id}`}
                name="amount"
                required
                inputMode="decimal"
                autoFocus
                placeholder="0.00"
                className="tabular min-w-0 flex-1 bg-transparent font-mono text-base outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-xl border-2 border-ink bg-dagat px-4 text-sm font-bold text-paper disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setMode(null)} className="h-11 rounded-xl border-2 border-ink px-3 text-sm font-semibold">
              Cancel
            </button>
          </div>
          {state.error && (
            <p role="alert" className="text-sm font-semibold text-chili">
              {state.error}
            </p>
          )}
        </form>
      )}
    </article>
  );
}
