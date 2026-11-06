import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "manager" | "foreman" | "worker";

export type Profile = {
  id: string;
  company_id: string | null;
  full_name: string;
  email: string | null;
  role: Role;
  hourly_rate: number;
  pay_period: "weekly" | "biweekly" | "monthly";
  consent_at: string | null;
};

export type Company = { id: string; name: string; logo_url: string | null; brand_color: string };

export function isManager(role: Role) {
  return role === "owner" || role === "manager";
}

/** Signed-in user's profile and company. Redirects to login or onboarding when missing. */
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, company_id, full_name, email, role, hourly_rate, pay_period, consent_at")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile?.company_id) redirect("/onboarding");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, logo_url, brand_color")
    .eq("id", profile.company_id)
    .single<Company>();
  if (!company) redirect("/onboarding");

  return { supabase, user, profile, company };
}

export async function requireManager() {
  const ctx = await requireProfile();
  if (!isManager(ctx.profile.role)) redirect("/today");
  return ctx;
}
