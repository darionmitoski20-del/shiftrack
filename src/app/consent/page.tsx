import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function accept() {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("profiles").update({ consent_at: new Date().toISOString() }).eq("id", user.id);
  redirect("/");
}

export default function ConsentPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <h1 className="font-display text-3xl font-bold">Before you start</h1>
      <div className="card flex flex-col gap-3 text-[15px] leading-relaxed">
        <p>Your employer uses ShiftTracks to record your work hours, approvals and project messages.</p>
        <p>This data is kept for 3 years and is visible to your company&apos;s managers.</p>
      </div>
      <form action={accept}>
        <button className="btn-primary">I agree</button>
      </form>
    </main>
  );
}
