/**
 * Insights charts. Presentational only (data comes in as props).
 * Colors: "this period" and "before" are one teal ramp, dark → light (validated
 * light-to-dark with the dataviz palette checker against the card surface). The light
 * step is under 3:1, so every value is also written out and there's a table view.
 */
import { formatDayKey } from "@/lib/dates";
import { niceMax, type DayBucket } from "@/lib/insights";
import { formatPeso } from "@/lib/money";

const CURRENT = "#0E5A57";
const BEFORE = "#7FB5AD";
const peso = (c: number) => formatPeso(c, { whole: true });

export type CategoryRow = { id: string; name: string; currentCents: number; previousCents: number };

function Legend({ current, before }: { current: string; before: string }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-3.5 rounded-[3px]" style={{ background: CURRENT }} />
        {current}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-3.5 rounded-[3px]" style={{ background: BEFORE }} />
        {before}
      </span>
    </div>
  );
}

/** Two thin bars per category: this period (dark) above the same days before (light). */
export function CategoryBars({
  rows,
  currentLabel,
  beforeLabel,
}: {
  rows: CategoryRow[];
  currentLabel: string;
  beforeLabel: string;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.currentCents, r.previousCents]));
  const pct = (c: number) => `${Math.max(c > 0 ? 1.5 : 0, (c / max) * 100)}%`;

  return (
    <div className="flex flex-col gap-3">
      <Legend current={currentLabel} before={beforeLabel} />
      <ul className="flex flex-col gap-3.5">
        {rows.map((r) => {
          const diff = r.currentCents - r.previousCents;
          return (
            <li key={r.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold">{r.name}</span>
                <span className="tabular shrink-0">
                  <strong>{peso(r.currentCents)}</strong>{" "}
                  <span className="text-muted">
                    was {peso(r.previousCents)}
                    {diff !== 0 && r.previousCents > 0 && (
                      <span className="sr-only">, {diff > 0 ? "up" : "down"} {peso(Math.abs(diff))}</span>
                    )}
                  </span>
                </span>
              </div>
              <div aria-hidden="true" className="flex flex-col gap-[2px]">
                <div className="h-3 rounded-r-[4px]" style={{ width: pct(r.currentCents), background: CURRENT }} title={`${currentLabel}: ${peso(r.currentCents)}`} />
                <div className="h-2 rounded-r-[4px]" style={{ width: pct(r.previousCents), background: BEFORE }} title={`${beforeLabel}: ${peso(r.previousCents)}`} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One column per day. The highest day is the only one labelled; the table has the rest. */
export function DayColumns({ days, compact }: { days: DayBucket[]; compact: boolean }) {
  const maxCents = Math.max(0, ...days.map((d) => d.cents));
  const top = niceMax(maxCents);
  const peak = days.find((d) => d.cents === maxCents && d.cents > 0);
  const height = 140;
  const summary = days
    .filter((d) => !d.isFuture)
    .map((d) => `${formatDayKey(d.key, { weekday: "short", day: "numeric" })} ${peso(d.cents)}`)
    .join(", ");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {/* y-axis: top tick and zero */}
        <div aria-hidden="true" className="tabular flex w-9 shrink-0 flex-col justify-between text-right font-mono text-[10px] text-muted" style={{ height }}>
          <span className="-translate-y-1/2">{peso(top).replace("₱", "")}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div className="relative flex-1" style={{ height }}>
          <div aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-sand" />
          <div
            role="img"
            aria-label={`Spending per day: ${summary}`}
            className={`absolute inset-0 flex items-end border-b border-ink ${compact ? "gap-[2px]" : "gap-2"}`}
          >
            {days.map((d) => {
              const h = d.cents > 0 ? Math.max(3, Math.round((d.cents / top) * height)) : 0;
              const isPeak = d === peak;
              return (
                <div key={d.key} className="relative flex h-full flex-1 flex-col items-center justify-end" title={`${formatDayKey(d.key, { weekday: "short", month: "short", day: "numeric" })}: ${peso(d.cents)}`}>
                  {isPeak && (
                    <span className="tabular absolute font-mono text-[11px] font-medium whitespace-nowrap text-ink" style={{ bottom: h + 4 }}>
                      {peso(d.cents)}
                    </span>
                  )}
                  <div
                    className="w-full max-w-6 rounded-t-[4px]"
                    style={{ height: h, background: isPeak ? "#C4421A" : CURRENT }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className={`ml-11 flex font-mono text-[11px] text-muted ${compact ? "gap-[2px]" : "gap-2"}`}>
        {days.map((d, i) => {
          const showLabel = !compact || i === 0 || (i + 1) % 7 === 0;
          return (
            <span key={d.key} className={`flex-1 text-center ${d.isToday ? "font-bold text-ink" : ""} ${d.isFuture ? "opacity-50" : ""}`}>
              {showLabel ? (compact ? formatDayKey(d.key, { day: "numeric" }) : formatDayKey(d.key, { weekday: "short" })) : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** The same numbers as a table, for screen readers and anyone who prefers it. */
export function DayTable({ days }: { days: DayBucket[] }) {
  const shown = days.filter((d) => !d.isFuture);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold">View as table</summary>
      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr className="border-b border-ink text-left text-xs text-muted">
            <th scope="col" className="py-1.5 font-medium">Day</th>
            <th scope="col" className="py-1.5 text-right font-medium">Spent</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((d) => (
            <tr key={d.key} className="border-b border-dashed border-rule">
              <td className="py-1.5">{formatDayKey(d.key, { weekday: "short", month: "short", day: "numeric" })}</td>
              <td className="tabular py-1.5 text-right">{peso(d.cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
