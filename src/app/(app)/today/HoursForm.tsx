"use client";

import { useActionState, useState } from "react";
import { formatHM, workedMinutes } from "@/lib/time";
import { submitHours, type SubmitState } from "./actions";

type Project = { id: string; name: string };

export function HoursForm({ projects, date }: { projects: Project[]; date: string }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitHours, {});
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("15:30");
  const [brk, setBrk] = useState(30);

  if (projects.length === 0) {
    return (
      <section className="card text-[15px] text-muted">
        You are not assigned to a project yet. Ask your manager to add you.
      </section>
    );
  }

  return (
    <form action={action} className="card flex flex-col gap-3.5">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="break" value={brk} />
      <label className="label">
        Project
        <select name="project" className="field font-semibold" defaultValue={projects[0].id}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label">
          Start
          <input name="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="field h-14 text-[22px] font-bold" required />
        </label>
        <label className="label">
          End
          <input name="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="field h-14 text-[22px] font-bold" required />
        </label>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-ground px-3 py-2.5">
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold text-[#3b3f45]">Break</span>
          <span className="text-lg font-bold">{brk} min</span>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Less break" onClick={() => setBrk(Math.max(0, brk - 15))} className="h-11 w-11 rounded-xl border border-[#cfcdc5] bg-white text-2xl font-semibold">
            −
          </button>
          <button type="button" aria-label="More break" onClick={() => setBrk(Math.min(120, brk + 15))} className="h-11 w-11 rounded-xl border border-[#cfcdc5] bg-white text-2xl font-semibold">
            +
          </button>
        </div>
      </div>
      <label className="label">
        Note (optional)
        <input name="note" className="field h-12 text-[15px]" placeholder="e.g. Formwork on 3rd floor" />
      </label>
      <div className="flex items-center justify-between border-t border-dashed border-line pt-3">
        <span className="text-sm text-muted">Total</span>
        <span className="font-display text-[26px] font-bold">{formatHM(workedMinutes(start, end, brk))}</span>
      </div>
      {state.error && <p className="rounded-xl bg-bad-bg p-3 text-sm text-bad">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-ok-bg p-3 text-sm font-semibold text-ok">Sent · waiting for manager</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send for approval"}
      </button>
    </form>
  );
}
