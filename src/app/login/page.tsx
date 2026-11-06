"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "in" ? signIn : signUp,
    {},
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="flex items-center gap-3">
        <img src="/icon.svg" alt="" className="h-12 w-12" />
        <h1 className="font-display text-3xl font-bold">ShiftTracks</h1>
      </div>
      <p className="text-muted">
        {mode === "in"
          ? "Sign in with the email your manager used to add you."
          : "Create an account to set up your company."}
      </p>
      <form action={action} className="card flex flex-col gap-4">
        <label className="label">
          Email
          <input className="field" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="label">
          Password
          <input
            className="field"
            name="password"
            type="password"
            minLength={8}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            required
          />
        </label>
        {state.error && <p className="rounded-xl bg-bad-bg p-3 text-sm text-bad">{state.error}</p>}
        {state.info && <p className="rounded-xl bg-ok-bg p-3 text-sm text-ok">{state.info}</p>}
        <button className="btn-primary" disabled={pending}>
          {mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="h-11 text-sm font-semibold text-muted underline"
      >
        {mode === "in" ? "New company? Create an account" : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
