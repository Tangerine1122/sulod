/** All money is integer centavos. Format only at the UI edge. */

const pesoFmt = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pesoWholeFmt = new Intl.NumberFormat("en-PH", {
  maximumFractionDigits: 0,
});

/** 18050 -> "₱180.50". Negative values get a real minus sign: "−₱180.50". */
export function formatPeso(cents: number, opts: { whole?: boolean } = {}): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents) / 100;
  const body = opts.whole ? pesoWholeFmt.format(Math.floor(abs)) : pesoFmt.format(abs);
  return `${sign}₱${body}`;
}

/** Splits 842050 into { whole: "8,420", fraction: "50" } for the big balance display. */
export function splitPeso(cents: number): { sign: string; whole: string; fraction: string } {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  return {
    sign,
    whole: pesoWholeFmt.format(Math.floor(abs / 100)),
    fraction: String(abs % 100).padStart(2, "0"),
  };
}

/**
 * Parses what a person types into a peso amount: "180", "180.5", "1,200", "₱2,000.00".
 * Returns centavos, or null if it is not a positive amount with at most 2 decimals.
 */
export function parsePesoToCents(input: string): number | null {
  const cleaned = input.replace(/[₱,\s]/g, "").replace(/^php/i, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}
