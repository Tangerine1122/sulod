"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/data";
import { parsePesoToCents } from "@/lib/money";
import { manilaDayKey, manilaMidnight } from "@/lib/dates";

export type FormState = { error?: string; ok?: boolean };

const pesoField = z
  .string()
  .transform((v, ctx) => {
    const cents = parsePesoToCents(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 180 or 180.50" });
      return z.NEVER;
    }
    return cents;
  });

const optionalPesoField = z
  .string()
  .transform((v, ctx) => {
    if (v.trim() === "" || v.trim() === "0") return 0;
    const cents = parsePesoToCents(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 640 or 1,780.50" });
      return z.NEVER;
    }
    return cents;
  });

const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";

// ---------------------------------------------------------------------------
// Wallets
// ---------------------------------------------------------------------------

const walletSchema = z.object({
  name: z.string().trim().min(1, "Give the wallet a name").max(40),
  type: z.enum(["cash", "debit", "ewallet", "savings"]),
  starting_balance: optionalPesoField,
});

export async function createWallet(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = walletSchema.safeParse({
    name: form.get("name") ?? "",
    type: form.get("type") ?? "",
    starting_balance: form.get("starting_balance") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("wallets").insert({
    name: parsed.data.name,
    type: parsed.data.type,
    starting_balance_cents: parsed.data.starting_balance,
    counts_as_spendable: parsed.data.type !== "savings",
  });
  if (error) return { error: "Couldn't save the wallet. Try again." };

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Transactions (manual form; AI quick-add will produce the same shape)
// ---------------------------------------------------------------------------

const transactionSchema = z
  .object({
    type: z.enum(["expense", "income", "transfer"]),
    amount: pesoField,
    wallet_id: z.uuid("Pick a wallet"),
    transfer_to_wallet_id: z.uuid().optional(),
    category_id: z.uuid().optional(),
    merchant: z.string().trim().max(80).optional(),
    note: z.string().trim().max(200).optional(),
    date: z.iso.date(),
  })
  .refine((t) => t.type !== "transfer" || (t.transfer_to_wallet_id && t.transfer_to_wallet_id !== t.wallet_id), {
    message: "Pick a different wallet to move the money to",
  });

const blankToUndefined = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : String(v));

type ParsedEntry = z.infer<typeof transactionSchema>;

function parseEntry(form: FormData): { data: ParsedEntry } | { error: string } {
  const parsed = transactionSchema.safeParse({
    type: form.get("type") ?? "",
    amount: form.get("amount") ?? "",
    wallet_id: form.get("wallet_id") ?? "",
    transfer_to_wallet_id: blankToUndefined(form.get("transfer_to_wallet_id")),
    category_id: blankToUndefined(form.get("category_id")),
    merchant: blankToUndefined(form.get("merchant")),
    note: blankToUndefined(form.get("note")),
    date: form.get("date") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (parsed.data.date > manilaDayKey(new Date())) return { error: "That date is in the future." };
  return { data: parsed.data };
}

/** Columns shared by insert and update. Fields that don't apply to the type are cleared. */
function entryColumns(t: ParsedEntry) {
  return {
    type: t.type,
    amount_cents: t.amount,
    wallet_id: t.wallet_id,
    transfer_to_wallet_id: t.type === "transfer" ? t.transfer_to_wallet_id : null,
    category_id: t.type === "expense" ? (t.category_id ?? null) : null,
    merchant: t.type === "transfer" ? null : (t.merchant ?? null),
    note: t.note ?? null,
  };
}

/** A date picked today keeps the current time; other days are stored as noon Manila time. */
function occurredAtFor(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const dayStart = manilaMidnight(y, m, d);
  const now = new Date();
  const isToday = now >= dayStart && now.getTime() < dayStart.getTime() + 86_400_000;
  return isToday ? now : new Date(dayStart.getTime() + 12 * 3_600_000);
}

const aiFields = z.object({
  source: z.literal("ai_text"),
  ai_confidence: z.coerce.number().min(0).max(1),
  raw_input: z.string().trim().min(1).max(200),
});

export async function createTransaction(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = parseEntry(form);
  if ("error" in parsed) return { error: parsed.error };

  // Entries the AI filled in keep its confidence and the original line (used later to learn
  // merchant → category corrections). Anything malformed is simply saved as manual.
  const ai = aiFields.safeParse({
    source: form.get("source"),
    ai_confidence: form.get("ai_confidence"),
    raw_input: form.get("raw_input"),
  });

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    ...entryColumns(parsed.data),
    occurred_at: occurredAtFor(parsed.data.date).toISOString(),
    ...(ai.success ? ai.data : { source: "manual" }),
  });
  if (error) return { error: "Couldn't save that. Try again." };

  revalidatePath("/", "layout");
  redirect("/");
}

const idSchema = z.uuid();

export async function updateTransaction(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return { error: "That entry no longer exists." };
  const parsed = parseEntry(form);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("transactions")
    .select("occurred_at")
    .eq("id", id.data)
    .maybeSingle();
  if (!existing) return { error: "That entry no longer exists." };

  // Keep the original time unless the day was changed.
  const sameDay = manilaDayKey(existing.occurred_at) === parsed.data.date;
  const { error } = await supabase
    .from("transactions")
    .update({
      ...entryColumns(parsed.data),
      occurred_at: sameDay ? existing.occurred_at : occurredAtFor(parsed.data.date).toISOString(),
    })
    .eq("id", id.data);
  if (error) return { error: "Couldn't save the changes. Try again." };

  revalidatePath("/", "layout");
  redirect("/activity");
}

export async function deleteTransaction(form: FormData): Promise<void> {
  await requireUserId();
  const id = idSchema.safeParse(form.get("id"));
  if (id.success) {
    const supabase = await createClient();
    // RLS limits this to the signed-in user's own rows.
    await supabase.from("transactions").delete().eq("id", id.data);
  }
  revalidatePath("/", "layout");
  redirect("/activity");
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function setAllowanceDay(form: FormData): Promise<void> {
  const userId = await requireUserId();
  // No coercion: Number(null) is 0, which would silently save "Sunday".
  const day = z.string().regex(/^[0-6]$/).transform(Number).safeParse(form.get("allowance_weekday"));
  if (!day.success) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ allowance_weekday: day.data }).eq("id", userId);
  revalidatePath("/", "layout");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
