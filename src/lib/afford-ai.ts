import "server-only";
import { generateText } from "ai";
import { withModels } from "@/lib/ai/models";
import { checkExplanation, explain, VERDICT_OPENERS, type AffordResult } from "@/lib/afford";
import { formatPeso } from "@/lib/money";

/**
 * The AI rewords the computed facts in a friendlier way. It gets the verdict and every
 * number already worked out; anything it adds is rejected and the plain version is used.
 */
export async function explainWithAI(r: AffordResult): Promise<{ text: string; via: "ai" | "plain" }> {
  const plain = explain(r);
  const peso = (c: number) => formatPeso(c, { whole: true });
  const facts = [
    `Thing: ${r.item || "the purchase"}, price ${peso(r.priceCents)}`,
    `Verdict (fixed, do not change): ${VERDICT_OPENERS[r.verdict]}`,
    `Spendable now: ${peso(r.spendableCents)} (savings not included)`,
    r.afterCents >= 0
      ? `Left after buying: ${peso(r.afterCents)}, about ${peso(r.dailyAfterCents)} a day for ${r.daysLeft} days`
      : `Short by: ${peso(-r.afterCents)}`,
    r.untilLabel ? `The ${r.daysLeft} days run until ${r.untilLabel}` : `No allowance day set; using ${r.daysLeft} days`,
    r.usualDailyCents === null
      ? `Usual daily spending: unknown (only ${r.historyDays} days of history)`
      : `Usual daily spending: about ${peso(r.usualDailyCents)}`,
    r.savingsCents > 0 ? `Savings, not counted: ${peso(r.savingsCents)}` : null,
    r.pendingGigCents > 0 ? `Gig pay still on the way, not counted: ${peso(r.pendingGigCents)}` : null,
  ].filter(Boolean);

  try {
    const text = await withModels(
      "afford",
      async (model, timeout) => {
        const { text } = await generateText({
          model,
          timeout,
          maxRetries: 0,
          system: `You explain a money decision to a college student in Cebu in 2 or 3 short, friendly sentences of plain English.
Start with exactly "${VERDICT_OPENERS[r.verdict]}" and never change that verdict.
Use only the numbers in the facts, written the same way (with ₱ and commas). Do not calculate anything new, add percentages, or give other advice.
Mention savings or gig pay only as money that isn't counted.`,
          prompt: facts.join("\n"),
        });
        return text.trim();
      },
      { budgetMs: 7000 },
    );
    return checkExplanation(text, r) ? { text, via: "ai" } : { text: plain, via: "plain" };
  } catch {
    return { text: plain, via: "plain" };
  }
}
