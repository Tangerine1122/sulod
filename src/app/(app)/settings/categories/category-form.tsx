"use client";

import { useActionState, type CSSProperties } from "react";
import { createCategory, updateCategory, type FormState } from "@/app/actions";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { useFormSubmit } from "@/lib/use-form-submit";

export function CategoryForm({ id, name, color }: { id?: string; name?: string; color?: string }) {
  const editing = Boolean(id);
  const [state, action, pending] = useActionState<FormState, FormData>(editing ? updateCategory : createCategory, {});
  const onSubmit = useFormSubmit(action);
  const selected = color && CATEGORY_COLORS.some((c) => c.hex.toLowerCase() === color.toLowerCase()) ? color.toUpperCase() : CATEGORY_COLORS[8].hex;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {id && <input type="hidden" name="id" value={id} />}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="category-name" className="text-sm text-muted">
          Name
        </label>
        <input
          id="category-name"
          name="name"
          required
          maxLength={30}
          defaultValue={name ?? ""}
          placeholder="Coffee, Gym, Gifts…"
          autoFocus={!editing}
          className="h-12 rounded-xl border-2 border-ink bg-slip px-3 text-base"
        />
      </div>

      <fieldset className="flex flex-col">
        <legend className="mb-2 text-sm text-muted">Color</legend>
        <div className="grid grid-cols-6 gap-2.5">
          {CATEGORY_COLORS.map((c) => (
            <label key={c.hex} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={c.hex}
                defaultChecked={c.hex === selected}
                aria-label={c.name}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="block aspect-square min-h-11 rounded-xl border-[1.5px] border-ink/30 bg-(--swatch) peer-checked:border-[3px] peer-checked:border-ink peer-checked:shadow-hard-sm peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-chili"
                style={{ "--swatch": c.hex } as CSSProperties}
              />
            </label>
          ))}
        </div>
      </fieldset>

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
        {pending ? "Saving…" : editing ? "Save changes" : "Add category"}
      </button>
    </form>
  );
}
