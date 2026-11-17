import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-start gap-3 px-4 pt-5 pb-8">
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">Entry not found</h1>
      <p className="text-muted">It may have been deleted.</p>
      <Link href="/activity" className="font-semibold underline">
        Back to activity
      </Link>
    </main>
  );
}
