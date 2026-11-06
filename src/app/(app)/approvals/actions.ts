"use server";

import { revalidatePath } from "next/cache";
import { requireManager } from "@/lib/session";

export async function reviewEntry(form: FormData) {
  const { supabase } = await requireManager();
  const id = String(form.get("id"));
  const decision = form.get("decision") === "approve" ? "approved" : "rejected";
  const comment = String(form.get("comment") ?? "").trim() || null;
  if (decision === "rejected" && !comment) return;
  await supabase.from("time_entries").update({ status: decision, manager_comment: comment }).eq("id", id);
  revalidatePath("/approvals");
}

export async function reviewCorrection(form: FormData) {
  const { supabase } = await requireManager();
  const id = String(form.get("id"));
  const accept = form.get("decision") === "accept";

  const { data: req } = await supabase
    .from("correction_requests")
    .select("entry_id, start_time, end_time, break_minutes")
    .eq("id", id)
    .single();
  if (!req) return;

  if (accept) {
    await supabase
      .from("time_entries")
      .update({
        start_time: req.start_time,
        end_time: req.end_time,
        break_minutes: req.break_minutes,
        status: "approved",
        manager_comment: null,
      })
      .eq("id", req.entry_id);
  }
  await supabase.from("correction_requests").update({ status: accept ? "accepted" : "declined" }).eq("id", id);
  revalidatePath("/approvals");
}
