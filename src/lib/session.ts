import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "manager" | "foreman" | "worker";

export type Profile = {
  id: string;
  company_id: string | null;
  full_name: string;
  email: string | null;
  role: Role;
  consent_at: string | null;
};

export type Company = { id: string; name: string; logo_url: string | null; brand_color: string };

export function isManager(role: Role) {
  return role === "owner" || role === "manager";
}

/** Signed-in user's profile and company. Redirects to login or onboarding when missing. */
export async function requireProfile() {
  // Signed-in screens always render per request; this also lets the Supabase client
  // and pages read the clock (Date.now / new Date) without a prerender error.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, company_id, full_name, email, role, consent_at")
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
