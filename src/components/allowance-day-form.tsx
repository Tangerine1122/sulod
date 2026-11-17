import { setAllowanceDay } from "@/app/actions";
import { weekdayName } from "@/lib/dates";

/** Server-rendered form; works without JavaScript. */
export function AllowanceDayForm({ current, compact = false }: { current: number | null; compact?: boolean }) {
  return (
    <form action={setAllowanceDay} className={`flex items-end gap-2 ${compact ? "" : "flex-wrap"}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor="allowance-day" className={compact ? "text-sm text-dagat-soft" : "text-sm text-muted"}>
          Which day does your allowance come in?
        </label>
        <select
          id="allowance-day"
          name="allowance_weekday"
          defaultValue={current ?? 1}
          className="h-11 rounded-xl border-2 border-ink bg-slip px-3 text-base text-ink"
        >
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <option key={d} value={d}>
              {weekdayName(d)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="h-11 rounded-xl border-2 border-ink bg-mango px-4 text-sm font-bold text-ink"
      >
        Save
      </button>
    </form>
  );
}
