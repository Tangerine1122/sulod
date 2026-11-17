import { Zigzag } from "@/components/zigzag";

/** Shown instantly while a page's data streams in. */
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading" className="flex animate-pulse flex-col gap-[22px] px-4 pt-5 pb-6">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 rounded bg-sand" />
        <div className="h-8 w-64 rounded-lg bg-sand" />
      </div>
      <div className="flex flex-col">
        <div className="h-52 rounded-t-[22px] bg-ink/85" />
        <Zigzag className="fill-ink/85" />
      </div>
      <div className="h-[72px] rounded-[18px] bg-sand" />
      <div className="h-14 rounded-2xl bg-sand" />
    </main>
  );
}
