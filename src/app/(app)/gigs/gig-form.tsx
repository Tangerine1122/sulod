"use client";

import { useActionState } from "react";
import { createGig, updateGig, type FormState } from "@/app/actions";
import { useFormSubmit } from "@/lib/use-form-submit";

export type GigDefaults = {
  id?: string;
  title?: string;
  work_date?: string;
  hours?: string;
  expected?: string;
};

const input = "h-12 rounded-xl border-2 border-ink bg-slip px-3 text-base";

export function GigForm({ defaults, today }: { defaults: GigDefaults; today: string }) {
  const editing = Boolean(defaults.id);
  const [state, action, pending] = useActionState<FormState, FormData>(editing ? updateGig : createGig, {});
  const onSubmit = useFormSubmit(action);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="gig-expected" className="label-mono text-muted">
          Expected pay
        </label>
        <div className="flex h-16 items-center gap-1 rounded-2xl border-2 border-ink bg-slip px-4 shadow-hard focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-chili">
          <span aria-hidden="true" className="font-display text-2xl font-medium text-muted">
            ₱
          </span>
          <input
            id="gig-expected"
            name="expected"
            required
            inputMode="decimal"
            defaultValue={defaults.expected ?? ""}
            placeholder="0.00"
            autoFocus={!defaults.expected}
            className="tabular min-w-0 flex-1 bg-transparent font-display text-[32px] font-extrabold tracking-tight outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="gig-title" className="text-sm text-muted">
          What was the gig?
        </label>
        <input
          id="gig-title"
          name="title"
          required
          maxLength={60}
          defaultValue={defaults.title ?? ""}
          placeholder="Photobooth shift"
          className={input}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gig-date" className="text-sm text-muted">
            Day worked
          </label>
          <input
            id="gig-date"
            name="work_date"
            type="date"
            required
            defaultValue={defaults.work_date ?? today}
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gig-hours" className="text-sm text-muted">
            Hours <span className="text-xs">(optional)</span>
          </label>
          <input
            id="gig-hours"
            name="hours"
            inputMode="decimal"
            defaultValue={defaults.hours ?? ""}
            placeholder="8"
            className={`${input} tabular`}
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
        {pending ? "Saving…" : editing ? "Save changes" : "Log shift"}
      </button>
    </form>
  );
}
