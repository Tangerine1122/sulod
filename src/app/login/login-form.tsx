"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";
import { useFormSubmit } from "@/lib/use-form-submit";
import { ArrowRightIcon } from "@/components/icons";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { error: initialError });
  const onSubmit = useFormSubmit(action);

  if (state.sentTo) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border-2 border-ink bg-slip p-5" role="status">
        <span className="label-mono text-dagat">Check your email</span>
        <p className="text-base">
          We sent a sign-in link to <strong>{state.sentTo}</strong>. Open it on this device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor="email" className="font-display text-lg font-bold">
        Your email
      </label>
      <div className="flex gap-2">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-ink bg-slip px-4 font-mono text-[15px] shadow-hard"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Send sign-in link"
          className="press flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-chili text-white disabled:opacity-60"
        >
          <ArrowRightIcon strokeWidth={2.5} />
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm font-semibold text-chili">
          {state.error}
        </p>
      ) : (
        <p className="text-sm text-muted">No password. We&apos;ll email you a link.</p>
      )}
    </form>
  );
}
