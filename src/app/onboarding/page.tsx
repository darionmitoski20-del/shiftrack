"use client";

import { useActionState } from "react";
import { createCompany } from "./actions";

export default function OnboardingPage() {
  const [state, action, pending] = useActionState(createCompany, {});
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <h1 className="font-display text-3xl font-bold">Set up your company</h1>
      <p className="text-muted">
        You will be the owner. Workers are added by you or your managers. If you are a worker,
        ask your manager to add your email instead.
      </p>
      <form action={action} className="card flex flex-col gap-4">
        <label className="label">
          Your name
          <input className="field" name="name" required />
        </label>
        <label className="label">
          Company name
          <input className="field" name="company" required />
        </label>
        <label className="flex items-start gap-3 text-sm text-[#3b3f45]">
          <input type="checkbox" name="consent" className="mt-1 h-5 w-5" required />
          I agree that ShiftTracks stores work hours and messages for my company for 3 years.
        </label>
        {state.error && <p className="rounded-xl bg-bad-bg p-3 text-sm text-bad">{state.error}</p>}
        <button className="btn-primary" disabled={pending}>
          Create company
        </button>
      </form>
    </main>
  );
}
