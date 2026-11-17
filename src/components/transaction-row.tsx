import Link from "next/link";
import { TransferIcon } from "./icons";
import { textOn } from "@/lib/color";
import { formatManila } from "@/lib/dates";
import { formatPeso } from "@/lib/money";
import type { TransactionRow as Row } from "@/lib/types";

/** One entry in a list. Links to its edit page. `showDate` adds the date to the detail line. */
export function TransactionRow({ t, showDate = true }: { t: Row; showDate?: boolean }) {
  const title =
    t.type === "transfer"
      ? `${t.wallet?.name ?? "?"} → ${t.to_wallet?.name ?? "?"}`
      : (t.merchant ?? t.category?.name ?? (t.type === "income" ? "Income" : "Expense"));
  const when = formatManila(
    t.occurred_at,
    showDate ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } : { hour: "numeric", minute: "2-digit" },
  );
  const detail =
    t.type === "transfer"
      ? `Transfer · not counted as spending`
      : `${t.type === "income" ? "Income" : (t.category?.name ?? "Uncategorized")} · ${t.wallet?.name ?? ""} · ${when}`;
  const chip = t.category?.color ?? "#cfc5b8";

  return (
    <li className="border-b border-dashed border-rule last:border-b-0">
      <Link href={`/activity/${t.id}`} className="flex min-h-14 items-center gap-3 py-2.5 hover:bg-sand/40">
        {t.type === "transfer" ? (
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-ink">
            <TransferIcon size={18} />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-display font-extrabold ${
              t.type === "income" ? "bg-dagat-soft text-dagat" : ""
            }`}
            style={t.type === "expense" ? { background: chip, color: textOn(chip) } : undefined}
          >
            {title.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate font-semibold">{title}</span>
          <span className="truncate text-xs text-muted">{detail}</span>
        </span>
        <span
          className={`tabular font-display font-bold ${
            t.type === "income" ? "text-dagat" : t.type === "transfer" ? "text-muted" : ""
          }`}
        >
          {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
          {formatPeso(t.amount_cents)}
        </span>
      </Link>
    </li>
  );
}
