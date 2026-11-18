import { Zigzag } from "@/components/zigzag";

export default function Loading() {
  return (
    <main aria-busy="true" className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em]">Checking your numbers…</h1>
      <section className="flex animate-pulse flex-col">
        <Zigzag className="fill-slip" flip />
        <div className="flex flex-col gap-4 bg-slip px-5 py-5">
          <div className="h-3 w-20 rounded bg-sand" />
          <div className="h-10 w-44 rounded-lg bg-sand" />
          <div className="border-t-[1.5px] border-dashed border-rule" />
          <div className="h-4 w-full rounded bg-sand" />
          <div className="h-4 w-full rounded bg-sand" />
          <div className="h-4 w-3/4 rounded bg-sand" />
        </div>
        <Zigzag className="fill-slip" />
      </section>
    </main>
  );
}
