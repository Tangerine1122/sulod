/**
 * Small, cheap models tried in order through AI Gateway. The free tier only allows some
 * models, so a refused model (401/402/403/404) moves on to the next one. The first model
 * that works is remembered for the life of the server instance.
 * Set QUICK_ADD_MODEL to force one model.
 *
 * No "server-only" import so eval scripts can use it.
 */
export const MODELS = process.env.QUICK_ADD_MODEL
  ? [process.env.QUICK_ADD_MODEL]
  : [
      "openai/gpt-5.4-nano", // confirmed working on the free tier (Nov 2026)
      "google/gemini-2.5-flash-lite",
      "openai/gpt-5-nano",
      "anthropic/claude-haiku-5.5", // 403 on the free tier; used if credits are bought
      "google/gemini-3.1-flash-lite", // 403 on the free tier
    ];

let workingModel: string | null = null;

/** True for errors that mean "this model isn't available to you", where trying another helps. */
function isRefusal(error: unknown): boolean {
  const e = error as { statusCode?: number; name?: string };
  return [401, 402, 403, 404].includes(e?.statusCode ?? 0) || /ModelNotFound|Authentication/.test(e?.name ?? "");
}

/**
 * Runs `call` with each model until one succeeds. `label` prefixes log lines; `redact` is
 * removed from logged error messages so user text never reaches the logs.
 */
export async function withModels<T>(
  label: string,
  call: (model: string, timeoutMs: number) => Promise<T>,
  { budgetMs = 10_000, redact = "" }: { budgetMs?: number; redact?: string } = {},
): Promise<T> {
  const candidates = workingModel ? [workingModel, ...MODELS.filter((m) => m !== workingModel)] : MODELS;
  const started = Date.now();
  let lastError: unknown = new Error("no model tried");

  for (const model of candidates) {
    const remaining = budgetMs - (Date.now() - started);
    if (remaining < 1500) break;
    try {
      const result = await call(model, Math.min(8000, remaining));
      if (workingModel !== model) console.info(`${label}: using ${model}`);
      workingModel = model;
      return result;
    } catch (error) {
      lastError = error;
      const e = error as { name?: string; statusCode?: number; message?: string };
      let message = String(e?.message ?? "");
      if (redact) message = message.replaceAll(redact, "[input]");
      console.error(`${label}: ${model} failed ${e?.name ?? "Error"} ${e?.statusCode ?? ""} ${message.slice(0, 300)}`);
      if (!isRefusal(error)) break; // timeouts and bad output won't get better on another model
    }
  }
  throw lastError;
}
