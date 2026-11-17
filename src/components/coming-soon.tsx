import { Zigzag } from "./zigzag";

export function ComingSoon({ title, step, blurb }: { title: string; step: string; blurb: string }) {
  return (
    <main className="flex flex-col gap-6 px-4 pt-5 pb-8">
      <h1 className="font-display text-[30px] font-extrabold tracking-[-0.02em]">{title}</h1>
      <section className="flex flex-col">
        <Zigzag className="fill-slip" flip />
        <div className="flex flex-col gap-2 bg-slip px-5 py-4">
          <span className="label-mono text-muted">{step}</span>
          <p className="text-base">{blurb}</p>
        </div>
        <Zigzag className="fill-slip" />
      </section>
    </main>
  );
}
