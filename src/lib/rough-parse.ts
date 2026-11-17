/**
 * Temporary, non-AI prefill for the manual form: takes the last number in a quick-add
 * line as the amount ("7-eleven 85" is ₱85, not ₱7) and the rest as the merchant. Build step 4 replaces this with the AI parser.
 */
export function roughParse(line: string): { merchant: string; amount: string } {
  const text = line.trim().slice(0, 120);
  const match = [...text.matchAll(/₱?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?/g)].at(-1);
  if (!match) return { merchant: text, amount: "" };
  const amount = `${match[1]}${match[2] ?? ""}`;
  const merchant = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).replace(/\s+/g, " ").trim();
  return { merchant, amount };
}
