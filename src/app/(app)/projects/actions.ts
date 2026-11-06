"use server";

import { revalidatePath } from "next/cache";
import { requireManager } from "@/lib/session";

export async function createProject(form: FormData) {
  const { supabase, profile } = await requireManager();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  const days = form.getAll("days").map(Number).filter((d) => d >= 1 && d <= 7);
  await supabase.from("projects").insert({
    company_id: profile.company_id,
    name,
    address: String(form.get("address") ?? "").trim() || null,
    client: String(form.get("client") ?? "").trim() || null,
    work_days: days.length ? days : [1, 2, 3, 4, 5],
  });
  revalidatePath("/projects");
}

export async function setMember(form: FormData) {
  const { supabase } = await requireManager();
  const projectId = String(form.get("project"));
  const userId = String(form.get("user"));
  if (form.get("assign") === "1") {
    await supabase.from("project_members").upsert({ project_id: projectId, user_id: userId });
  } else {
    await supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
  }
  revalidatePath("/projects");
}
