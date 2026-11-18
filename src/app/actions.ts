"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_HEXES } from "@/lib/category-colors";
import { getGoal, getGoals, getWallet, getWalletBalances, requireUserId } from "@/lib/data";
import { unassignedSavings } from "@/lib/goals";
import { formatPeso, parsePesoToCents } from "@/lib/money";
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

// ---------------------------------------------------------------------------
// Gigs
// ---------------------------------------------------------------------------

const gigSchema = z.object({
  title: z.string().trim().min(1, "Give the shift a name").max(60),
  work_date: z.iso.date("Pick the day you worked"),
  hours: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0 || n > 24 || Math.round(n * 10) !== n * 10) {
        ctx.addIssue({ code: "custom", message: "Hours should be a number like 8 or 7.5" });
        return z.NEVER;
      }
      return n;
    }),
  expected: pesoField,
});

function parseGig(form: FormData) {
  const parsed = gigSchema.safeParse({
    title: form.get("title") ?? "",
    work_date: form.get("work_date") ?? "",
    hours: form.get("hours") ?? "",
    expected: form.get("expected") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) } as const;
  // Shifts can be logged ahead, but not absurdly far.
  const limit = manilaDayKey(new Date(Date.now() + 90 * 86_400_000));
  if (parsed.data.work_date > limit) return { error: "That date is too far ahead." } as const;
  return { data: parsed.data } as const;
}

export async function createGig(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = parseGig(form);
  if ("error" in parsed) return { error: parsed.error };
  const g = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("gigs")
    .insert({ title: g.title, work_date: g.work_date, hours: g.hours, expected_cents: g.expected });
  if (error) return { error: "Couldn't save the shift. Try again." };

  revalidatePath("/", "layout");
  redirect("/gigs");
}

export async function updateGig(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return { error: "That shift no longer exists." };
  const parsed = parseGig(form);
  if ("error" in parsed) return { error: parsed.error };
  const g = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("gigs")
    .update({ title: g.title, work_date: g.work_date, hours: g.hours, expected_cents: g.expected })
    .eq("id", id.data);
  if (error) return { error: "Couldn't save the changes. Try again." };

  revalidatePath("/", "layout");
  redirect("/gigs");
}

const markPaidSchema = z.object({
  id: z.uuid(),
  wallet_id: z.uuid("Pick the wallet it went into"),
  amount: pesoField,
  date: z.iso.date(),
});

export async function markGigPaid(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = markPaidSchema.safeParse({
    id: form.get("id") ?? "",
    wallet_id: form.get("wallet_id") ?? "",
    amount: form.get("amount") ?? "",
    date: form.get("date") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const p = parsed.data;
  if (p.date > manilaDayKey(new Date())) return { error: "That date is in the future." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_gig_paid", {
    p_gig: p.id,
    p_wallet: p.wallet_id,
    p_amount_cents: p.amount,
    p_paid_at: occurredAtFor(p.date).toISOString(),
  });
  if (error) {
    return { error: error.message.includes("already paid") ? "This shift is already marked paid." : "Couldn't save that. Try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function undoGigPaid(form: FormData): Promise<void> {
  await requireUserId();
  const id = idSchema.safeParse(form.get("id"));
  if (id.success) {
    const supabase = await createClient();
    await supabase.rpc("undo_gig_paid", { p_gig: id.data });
  }
  revalidatePath("/", "layout");
  redirect("/gigs");
}

export async function deleteGig(form: FormData): Promise<void> {
  await requireUserId();
  const id = idSchema.safeParse(form.get("id"));
  if (id.success) {
    const supabase = await createClient();
    await supabase.rpc("delete_gig", { p_gig: id.data });
  }
  revalidatePath("/", "layout");
  redirect("/gigs");
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

const goalSchema = z.object({
  name: z.string().trim().min(1, "Give the goal a name").max(40),
  target: pesoField,
  target_date: z.union([z.literal(""), z.iso.date()]).transform((v) => v || null),
});

function parseGoal(form: FormData) {
  const parsed = goalSchema.safeParse({
    name: form.get("name") ?? "",
    target: form.get("target") ?? "",
    target_date: form.get("target_date") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) } as const;
  if (parsed.data.target_date && parsed.data.target_date < manilaDayKey(new Date())) {
    return { error: "Pick a date from today on." } as const;
  }
  return { data: parsed.data } as const;
}

export async function createGoal(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = parseGoal(form);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .insert({ name: parsed.data.name, target_cents: parsed.data.target, target_date: parsed.data.target_date });
  if (error) return { error: "Couldn't save the goal. Try again." };
  revalidatePath("/", "layout");
  redirect("/goals");
}

export async function updateGoal(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return { error: "That goal no longer exists." };
  const parsed = parseGoal(form);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({ name: parsed.data.name, target_cents: parsed.data.target, target_date: parsed.data.target_date })
    .eq("id", id.data);
  if (error) return { error: "Couldn't save the changes. Try again." };
  revalidatePath("/", "layout");
  redirect("/goals");
}

export async function deleteGoal(form: FormData): Promise<void> {
  await requireUserId();
  const id = idSchema.safeParse(form.get("id"));
  if (id.success) {
    const supabase = await createClient();
    // The money stays in savings; it just stops being set aside for this goal.
    await supabase.from("goals").delete().eq("id", id.data);
  }
  revalidatePath("/", "layout");
  redirect("/goals");
}

const adjustSchema = z.object({ id: z.uuid(), direction: z.enum(["add", "remove"]), amount: pesoField });

/** Sets money aside for a goal from savings that isn't set aside yet, or gives it back. */
export async function adjustGoal(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = adjustSchema.safeParse({
    id: form.get("id") ?? "",
    direction: form.get("direction") ?? "",
    amount: form.get("amount") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { id, direction, amount } = parsed.data;

  const [goal, goals, wallets] = await Promise.all([getGoal(id), getGoals(), getWalletBalances()]);
  if (!goal) return { error: "That goal no longer exists." };

  let saved: number;
  if (direction === "add") {
    const savings = wallets.filter((w) => !w.counts_as_spendable).reduce((s, w) => s + w.balance_cents, 0);
    const free = unassignedSavings(savings, goals);
    if (amount > free) {
      return {
        error:
          free > 0
            ? `Only ${formatPeso(free)} of your savings isn't set aside yet. Move more into savings first.`
            : "All your savings are already set aside. Move more into savings first.",
      };
    }
    saved = goal.saved_cents + amount;
  } else {
    if (amount > goal.saved_cents) return { error: `Only ${formatPeso(goal.saved_cents)} is set aside for this goal.` };
    saved = goal.saved_cents - amount;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("goals").update({ saved_cents: saved }).eq("id", id);
  if (error) return { error: "Couldn't save that. Try again." };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Wallet editing
// ---------------------------------------------------------------------------

const walletEditSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Give the wallet a name").max(40),
  type: z.enum(["cash", "debit", "ewallet", "savings"]),
  balance: z.string().trim().transform((v, ctx) => {
    // Balances can be zero or negative (an overdrawn card), so this accepts "-120.50".
    const negative = v.startsWith("-");
    const cents = v === "" || v === "0" ? 0 : parsePesoToCents(negative ? v.slice(1) : v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Enter the balance like 1780 or 1,780.50" });
      return z.NEVER;
    }
    return negative ? -cents : cents;
  }),
});

/**
 * Renames, retypes and corrects a wallet's balance. A corrected balance is applied by
 * shifting the starting balance, so every past entry stays exactly as it was.
 */
export async function updateWallet(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = walletEditSchema.safeParse({
    id: form.get("id") ?? "",
    name: form.get("name") ?? "",
    type: form.get("type") ?? "",
    balance: form.get("balance") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const w = parsed.data;

  const current = await getWallet(w.id);
  if (!current || current.archived || current.balance_cents === null) return { error: "That wallet no longer exists." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wallets")
    .update({
      name: w.name,
      type: w.type,
      counts_as_spendable: w.type !== "savings",
      starting_balance_cents: current.starting_balance_cents + (w.balance - current.balance_cents),
    })
    .eq("id", w.id);
  if (error) return { error: "Couldn't save the wallet. Try again." };

  revalidatePath("/", "layout");
  redirect("/settings");
}

async function setArchived(form: FormData, archived: boolean) {
  await requireUserId();
  const id = idSchema.safeParse(form.get("id"));
  if (id.success) {
    const supabase = await createClient();
    await supabase.from("wallets").update({ archived }).eq("id", id.data);
  }
  revalidatePath("/", "layout");
  redirect("/settings");
}

/** Hides a wallet that has history. Its entries stay and still count in spending totals. */
export async function archiveWallet(form: FormData): Promise<void> {
  await setArchived(form, true);
}

export async function restoreWallet(form: FormData): Promise<void> {
  await setArchived(form, false);
}

/** Deletes a wallet only if nothing uses it; otherwise it is archived instead. */
export async function deleteWallet(form: FormData): Promise<void> {
  await requireUserId();
  const id = idSchema.safeParse(form.get("id"));
  if (id.success) {
    const w = await getWallet(id.data);
    const supabase = await createClient();
    if (w && w.entry_count === 0) {
      await supabase.from("wallets").delete().eq("id", id.data);
    } else if (w) {
      await supabase.from("wallets").update({ archived: true }).eq("id", id.data);
    }
  }
  revalidatePath("/", "layout");
  redirect("/settings");
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().trim().min(1, "Give the category a name").max(30),
  color: z.enum(CATEGORY_HEXES, "Pick a color"),
});

function parseCategory(form: FormData) {
  return categorySchema.safeParse({ name: form.get("name") ?? "", color: form.get("color") ?? "" });
}

const duplicateName = (e: { code?: string } | null) => e?.code === "23505";

export async function createCategory(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const parsed = parseCategory(form);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ name: parsed.data.name, color: parsed.data.color });
  if (duplicateName(error)) return { error: `You already have a category called "${parsed.data.name}".` };
  if (error) return { error: "Couldn't save the category. Try again." };
  revalidatePath("/", "layout");
  redirect("/settings");
}

export async function updateCategory(_: FormState, form: FormData): Promise<FormState> {
  await requireUserId();
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) return { error: "That category no longer exists." };
  const parsed = parseCategory(form);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name, color: parsed.data.color })
    .eq("id", id.data);
  if (duplicateName(error)) return { error: `You already have a category called "${parsed.data.name}".` };
  if (error) return { error: "Couldn't save the category. Try again." };
  revalidatePath("/", "layout");
  redirect("/settings");
}

/** Its entries become Uncategorized (the foreign key sets them to null). */
export async function deleteCategory(form: FormData): Promise<void> {
  await requireUserId();
  const id = idSchema.safeParse(form.get("id"));
  if (id.success) {
    const supabase = await createClient();
    await supabase.from("categories").delete().eq("id", id.data);
  }
  revalidatePath("/", "layout");
  redirect("/settings");
}
