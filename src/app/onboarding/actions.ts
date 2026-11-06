"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCompany(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const companyName = String(form.get("company") ?? "").trim();
  const ownerName = String(form.get("name") ?? "").trim();
  if (!companyName || !ownerName) return { error: "Fill in both fields." };
  if (form.get("consent") !== "on") return { error: "Please accept the data processing terms." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_company", {
    company_name: companyName,
    owner_name: ownerName,
  });
  if (error) return { error: error.message };
  redirect("/approvals");
}
