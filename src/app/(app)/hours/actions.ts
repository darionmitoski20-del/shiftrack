"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/session";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function requestCorrection(form: FormData) {
  const { supabase, profile } = await requireProfile();
  const start = String(form.get("start") ?? "");
  const end = String(form.get("end") ?? "");
  const breakMinutes = Number(form.get("break") ?? 0);
  const reason = String(form.get("reason") ?? "").trim();
  if (!TIME.test(start) || !TIME.test(end) || !reason || !Number.isInteger(breakMinutes)) return;

  await supabase.from("correction_requests").insert({
    company_id: profile.company_id,
    entry_id: String(form.get("entry")),
    user_id: profile.id,
    start_time: start,
    end_time: end,
    break_minutes: breakMinutes,
    reason,
  });
  revalidatePath("/hours");
}
