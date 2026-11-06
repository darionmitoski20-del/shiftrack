"use client";

import { useActionState } from "react";
import { addPerson, type AddState } from "./actions";

export function AddPersonForm({ canAddManagers }: { canAddManagers: boolean }) {
  const [state, action, pending] = useActionState<AddState, FormData>(addPerson, {});
  return (
    <form action={action} className="card flex flex-col gap-3">
      <h2 className="font-bold">Add a person</h2>
      <label className="label">Full name<input name="name" className="field" required /></label>
      <label className="label">Email<input name="email" type="email" className="field" required /></label>
      <label className="label">
        Password for them (at least 8 characters)
        <input name="password" type="text" minLength={8} autoComplete="off" className="field" required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          Role
          <select name="role" className="field" defaultValue="worker">
            <option value="worker">Worker</option>
            <option value="foreman">Foreman</option>
            {canAddManagers && <option value="manager">Manager</option>}
          </select>
        </label>
        <label className="label">
          Paid
          <select name="period" className="field" defaultValue="monthly">
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
      </div>
      <label className="label">Hourly rate<input name="rate" type="number" min={0} step="0.01" defaultValue={0} className="field" /></label>
      {state.error && <p className="rounded-xl bg-bad-bg p-3 text-sm text-bad">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-ok-bg p-3 text-sm text-ok">{state.ok}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
    </form>
  );
}
