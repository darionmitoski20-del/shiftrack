import { requireManager } from "@/lib/session";
import { AddPersonForm } from "./AddPersonForm";
import { updatePerson } from "./actions";

export default async function TeamPage() {
  const { supabase, profile } = await requireManager();
  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, hourly_rate, pay_period")
    .eq("active", true)
    .order("full_name");

  return (
    <>
      <h1 className="font-display text-[28px] font-bold">Team</h1>
      {(people ?? []).map((p) => (
        <form key={p.id} action={updatePerson} className="card flex flex-col gap-2">
          <input type="hidden" name="id" value={p.id} />
          <div className="flex items-center justify-between">
            <b>{p.full_name || p.email}</b>
            <span className="text-xs font-bold uppercase text-muted">{p.role}</span>
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <label className="label">Rate / h<input name="rate" type="number" min={0} step="0.01" defaultValue={p.hourly_rate} className="field h-11" /></label>
            <label className="label">
              Paid
              <select name="period" defaultValue={p.pay_period} className="field h-11">
                <option value="weekly">Weekly</option>
                <option value="biweekly">2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <button className="h-11 rounded-xl bg-ink px-3 text-sm font-bold text-white">Save</button>
          </div>
        </form>
      ))}
      <AddPersonForm canAddManagers={profile.role === "owner"} />
    </>
  );
}
