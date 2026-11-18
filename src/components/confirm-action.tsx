"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  action: (form: FormData) => void | Promise<void>;
  id: string;
  label: string;
  confirmLabel: string;
  pendingLabel?: string;
  /** "danger" fills red when armed; "plain" fills ink. */
  tone?: "danger" | "plain";
};

/** Two taps: the first arms the button, the second confirms. Disarms after 4 seconds. */
export function ConfirmAction({ action, id, label, confirmLabel, pendingLabel = "Working…", tone = "danger" }: Props) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {armed ? (
        <Confirm label={confirmLabel} pendingLabel={pendingLabel} tone={tone} />
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className={`h-12 w-full rounded-xl border-2 border-ink text-sm font-semibold ${tone === "danger" ? "text-chili" : ""}`}
        >
          {label}
        </button>
      )}
    </form>
  );
}

function Confirm({ label, pendingLabel, tone }: { label: string; pendingLabel: string; tone: "danger" | "plain" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      autoFocus
      className={`h-12 w-full rounded-xl border-2 border-ink text-sm font-bold disabled:opacity-60 ${
        tone === "danger" ? "bg-chili text-white" : "bg-ink text-paper"
      }`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
