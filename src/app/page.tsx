import { redirect } from "next/navigation";
import { isManager, requireProfile } from "@/lib/session";

// Every screen depends on the signed-in user, so these routes render per request.
export const instant = false;

export default async function Home() {
  const { profile } = await requireProfile();
  redirect(isManager(profile.role) ? "/approvals" : "/today");
}
