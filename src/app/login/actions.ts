"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; sentTo?: string };

export async function sendMagicLink(_: LoginState, form: FormData): Promise<LoginState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) return { error: "That doesn't look like an email address." };

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? h.get("origin") ?? `https://${h.get("x-forwarded-host") ?? h.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: "Couldn't send the link. Wait a minute and try again." };

  return { sentTo: email.data };
}
