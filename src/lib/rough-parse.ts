/**
 * Temporary, non-AI prefill for the manual form: finds the first number in a quick-add
 * line and treats the rest as the merchant. Build step 4 replaces this with the AI parser.
 */
export function roughParse(line: string): { merchant: string; amount: string } {
  const text = line.trim().slice(0, 120);
  const match = /₱?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?/.exec(text);
  if (!match) return { merchant: text, amount: "" };
  const amount = `${match[1]}${match[2] ?? ""}`;
  const merchant = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).replace(/\s+/g, " ").trim();
  return { merchant, amount };
}
