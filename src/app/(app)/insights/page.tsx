import Link from "next/link";
import { connection } from "next/server";
import { CategoryBars, DayColumns, DayTable } from "@/components/insights";
import { getInsights } from "@/lib/data";
import { formatManila } from "@/lib/dates";
import type { Period } from "@/lib/insights";
import { formatPeso } from "@/lib/money";

export default async function InsightsPage({ searchParams }: PageProps<"/insights">) {
  await connection();
  const { period: raw } = await searchParams;
  const period: Period = raw === "month" ? "month" : "week";
  const now = new Date();
  const data = await getInsights(now, period);

  const thisLabel = period === "week" ? "This week" : formatManila(now, { month: "long" });
  const beforeLabel = period === "week" ? "Same days last week" : "Same days last month";
  const diff = data.previousCents - data.totalCents;
  const hasAny = data.totalCents > 0 || data.previousCents > 0;

  return (
    <main className="flex flex-col gap-[22px] px-4 pt-5 pb-6">
      <header className="flex flex-col gap-3.5">
        <h1 className="font-display text-[30px] font-extrabold tracking-[-0.02em]">Insights</h1>
        <nav aria-label="Period" className="grid grid-cols-2 overflow-hidden rounded-[14px] border-2 border-ink">
          {(["week", "month"] as const).map((p, i) => (
            <Link
              key={p}
              href={p === "week" ? "/insights" : "/insights?period=month"}
              aria-current={period === p ? "page" : undefined}
              scroll={false}
              className={`flex min-h-11 items-center justify-center text-sm ${i > 0 ? "border-l-2 border-ink" : ""} ${
                period === p ? "bg-ink font-bold text-paper" : ""
              }`}
            >
              {p === "week" ? "Week" : "Month"}
            </Link>
          ))}
        </nav>
      </header>

      {/* Totals */}
      <section aria-label="Totals" className="flex flex-col gap-1.5 rounded-2xl border-2 border-ink bg-slip p-4 shadow-hard">
        <span className="label-mono text-muted">{thisLabel} so far</span>
        <span className="tabular font-display text-[40px] leading-none font-extrabold tracking-tight">
          {formatPeso(data.totalCents, { whole: true })}
        </span>
        {data.previousCents > 0 && diff !== 0 ? (
          <span className={`text-sm font-semibold ${diff > 0 ? "text-dagat" : "text-chili"}`}>
            {diff > 0 ? "↓" : "↑"} {formatPeso(Math.abs(diff), { whole: true })} {diff > 0 ? "less" : "more"} than the same days{" "}
            {period === "week" ? "last week" : "last month"} ({formatPeso(data.previousCents, { whole: true })})
          </span>
        ) : (
          <span className="text-sm text-muted">
            {data.previousCents > 0 ? "Same as" : "Nothing spent in"} the same days {period === "week" ? "last week" : "last month"}.
          </span>
        )}
      </section>

      {!hasAny ? (
        <p className="rounded-2xl border-[1.5px] border-dashed border-muted p-5 text-sm text-muted">
          No spending logged yet {period === "week" ? "this week or last week" : "this month or last month"}. Charts show up once you log a few entries.
        </p>
      ) : (
        <>
          <section aria-labelledby="by-category" className="flex flex-col gap-3">
            <h2 id="by-category" className="font-display text-lg font-bold">
              By category
            </h2>
            <CategoryBars rows={data.categories} currentLabel={thisLabel} beforeLabel={beforeLabel} />
          </section>

          <section aria-labelledby="by-day" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 id="by-day" className="font-display text-lg font-bold">
                Day by day
              </h2>
              <span className="text-xs text-muted">Highest day in red</span>
            </div>
            <DayColumns days={data.days} compact={period === "month"} />
            <DayTable days={data.days} />
          </section>
        </>
      )}
    </main>
  );
}
