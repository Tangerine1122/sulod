import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { deleteCategory } from "@/app/actions";
import { ConfirmAction } from "@/components/confirm-action";
import { ArrowLeftIcon } from "@/components/icons";
import { getCategory } from "@/lib/data";
import { CategoryForm } from "../category-form";

export default async function EditCategoryPage({ params }: PageProps<"/settings/categories/[id]">) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const c = await getCategory(id);
  if (!c) notFound();

  const entries = `${c.entry_count} ${c.entry_count === 1 ? "entry" : "entries"}`;

  return (
    <main className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <header className="flex items-center gap-3">
        <Link href="/settings" aria-label="Back to settings" className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink">
          <ArrowLeftIcon size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">Edit category</h1>
      </header>
      <CategoryForm id={c.id} name={c.name} color={c.color} />
      <p className="text-xs text-muted">
        {c.entry_count > 0 ? `Renaming or recoloring updates all ${entries} using it.` : "No entries use this category yet."}
      </p>
      <ConfirmAction
        action={deleteCategory}
        id={c.id}
        label="Delete category"
        confirmLabel={c.entry_count > 0 ? `Tap again. Its ${entries} become Uncategorized.` : "Tap again to delete"}
        pendingLabel="Deleting…"
      />
    </main>
  );
}
