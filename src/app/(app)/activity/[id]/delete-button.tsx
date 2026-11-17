"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteTransaction } from "@/app/actions";

/** Two taps to delete: the first arms the button, the second confirms. Disarms after 4 seconds. */
export function DeleteButton({ id }: { id: string }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <form action={deleteTransaction}>
      <input type="hidden" name="id" value={id} />
      {armed ? (
        <ConfirmButton />
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="h-12 w-full rounded-xl border-2 border-ink text-sm font-semibold text-chili"
        >
          Delete entry
        </button>
      )}
    </form>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      autoFocus
      className="h-12 w-full rounded-xl border-2 border-ink bg-chili text-sm font-bold text-white disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Tap again to delete"}
    </button>
  );
}
