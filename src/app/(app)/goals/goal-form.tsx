"use client";

import { useActionState } from "react";
import { createGoal, updateGoal, type FormState } from "@/app/actions";
import { useFormSubmit } from "@/lib/use-form-submit";

export type GoalDefaults = { id?: string; name?: string; target?: string; target_date?: string };

export function GoalForm({ defaults, today }: { defaults: GoalDefaults; today: string }) {
  const editing = Boolean(defaults.id);
  const [state, action, pending] = useActionState<FormState, FormData>(editing ? updateGoal : createGoal, {});
  const onSubmit = useFormSubmit(action);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="goal-name" className="text-sm text-muted">
          What are you saving for?
        </label>
        <input
          id="goal-name"
          name="name"
          required
          maxLength={40}
          defaultValue={defaults.name ?? ""}
          placeholder="Emergency fund, new laptop…"
          autoFocus={!editing}
          className="h-12 rounded-xl border-2 border-ink bg-slip px-3 text-base"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="goal-target" className="label-mono text-muted">
          Target
        </label>
        <div className="flex h-16 items-center gap-1 rounded-2xl border-2 border-ink bg-slip px-4 shadow-hard focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-chili">
          <span aria-hidden="true" className="font-display text-2xl font-medium text-muted">
            ₱
          </span>
          <input
            id="goal-target"
            name="target"
            required
            inputMode="decimal"
            defaultValue={defaults.target ?? ""}
            placeholder="0.00"
            className="tabular min-w-0 flex-1 bg-transparent font-display text-[32px] font-extrabold tracking-tight outline-none"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="goal-date" className="text-sm text-muted">
          By when? <span className="text-xs">(optional)</span>
        </label>
        <input
          id="goal-date"
          name="target_date"
          type="date"
          min={today}
          defaultValue={defaults.target_date ?? ""}
          className="h-12 rounded-xl border-2 border-ink bg-slip px-3 text-base"
        />
        <p className="text-xs text-muted">With a date, Sulod tells you how much to set aside each week.</p>
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
        {pending ? "Saving…" : editing ? "Save changes" : "Add goal"}
      </button>
    </form>
  );
}
