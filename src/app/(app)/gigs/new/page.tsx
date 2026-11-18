import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeftIcon } from "@/components/icons";
import { getLastGig } from "@/lib/data";
import { manilaDayKey } from "@/lib/dates";
import { GigForm } from "../gig-form";

export default async function NewGigPage() {
  await connection();
  // Start from the last shift's name, hours and pay, since most shifts repeat.
  const last = await getLastGig();

  return (
    <main className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href="/gigs"
          aria-label="Back to gig pay"
          className="flex size-11 items-center justify-center rounded-[14px] border-[1.5px] border-ink"
        >
          <ArrowLeftIcon size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">Log a shift</h1>
      </header>
      <GigForm
        today={manilaDayKey(new Date())}
        defaults={
          last
            ? {
                title: last.title,
                hours: last.hours === null ? "" : String(last.hours),
                expected: (last.expected_cents / 100).toFixed(2).replace(/\.00$/, ""),
              }
            : {}
        }
      />
    </main>
  );
}
