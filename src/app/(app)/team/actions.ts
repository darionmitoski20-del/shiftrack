"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireManager } from "@/lib/session";

const ROLES = ["manager", "foreman", "worker"] as const;
const PERIODS = ["weekly", "biweekly", "monthly"] as const;

export type AddState = { ok?: string; error?: string };

/** Creates an account with a password the manager hands to the person, and attaches it to the company. */
export async function addPerson(_: AddState, form: FormData): Promise<AddState> {
  const { profile } = await requireManager();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const fullName = String(form.get("name") ?? "").trim();
  const role = String(form.get("role")) as (typeof ROLES)[number];
  const period = String(form.get("period")) as (typeof PERIODS)[number];
  const rate = Number(form.get("rate") ?? 0);
  const password = String(form.get("password") ?? "");
  if (!email || !fullName) return { error: "Name and email are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!ROLES.includes(role) || !PERIODS.includes(period)) return { error: "Invalid role or pay period." };
  if (role === "manager" && profile.role !== "owner") return { error: "Only the owner can add managers." };
  if (!Number.isFinite(rate) || rate < 0) return { error: "Hourly rate is not valid." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) return { error: error?.message ?? "Could not create this account." };

  const { data: updated, error: upErr } = await admin
    .from("profiles")
    .update({ company_id: profile.company_id, full_name: fullName, role })
    .eq("id", data.user.id)
    .is("company_id", null)
    .select("id");
  if (upErr) return { error: upErr.message };
  if (!updated?.length) return { error: "This email already belongs to another company." };

  const { error: payErr } = await admin
    .from("pay_settings")
    .upsert({ user_id: data.user.id, company_id: profile.company_id, hourly_rate: rate, pay_period: period });
  if (payErr) return { error: payErr.message };

  revalidatePath("/team");
  return { ok: `Account created. Give ${fullName} the email ${email} and the password to sign in.` };
}

export async function updatePerson(form: FormData) {
  const { supabase, profile } = await requireManager();
  const rate = Number(form.get("rate"));
  const period = String(form.get("period")) as (typeof PERIODS)[number];
  if (!Number.isFinite(rate) || rate < 0 || !PERIODS.includes(period)) return;
  await supabase.from("pay_settings").upsert({
    user_id: String(form.get("id")),
    company_id: profile.company_id,
    hourly_rate: rate,
    pay_period: period,
  });
  revalidatePath("/team");
}
