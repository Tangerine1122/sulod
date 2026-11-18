import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import { CategoryForm } from "../category-form";

export default function NewCategoryPage() {
  return (
    <main className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <header className="flex items-center gap-3">
        <Link href="/settings" aria-label="Back to settings" className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink">
          <ArrowLeftIcon size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">New category</h1>
      </header>
      <CategoryForm />
      <p className="text-xs text-muted">The AI quick-add can pick it right away.</p>
    </main>
  );
}
