import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function setPassword(form: FormData) {
  "use server";
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/login?error=password");
  redirect("/");
}

export default function SetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <h1 className="font-display text-3xl font-bold">Choose a password</h1>
      <form action={setPassword} className="card flex flex-col gap-4">
        <label className="label">
          New password (at least 8 characters)
          <input className="field" name="password" type="password" minLength={8} autoComplete="new-password" required />
        </label>
        <button className="btn-primary">Save and continue</button>
      </form>
    </main>
  );
}
