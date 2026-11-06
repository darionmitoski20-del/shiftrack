import { requireManager } from "@/lib/session";
import { createProject, setMember } from "./actions";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Project = {
  id: string;
  name: string;
  address: string | null;
  client: string | null;
  work_days: number[];
  project_members: { user_id: string }[];
};

export default async function ProjectsPage() {
  const { supabase } = await requireManager();
  const [{ data: projects }, { data: people }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, address, client, work_days, project_members(user_id)")
      .eq("archived", false)
      .order("name")
      .returns<Project[]>(),
    supabase.from("profiles").select("id, full_name, role").eq("active", true).order("full_name"),
  ]);

  return (
    <>
      <h1 className="font-display text-[28px] font-bold">Projects</h1>

      {(projects ?? []).map((p) => {
        const assigned = new Set(p.project_members.map((m) => m.user_id));
        return (
          <article key={p.id} className="card flex flex-col gap-2">
            <b className="text-lg">{p.name}</b>
            <p className="text-sm text-muted">
              {[p.address, p.client].filter(Boolean).join(" · ") || "No address or client"} · {p.work_days.map((d) => DAYS[d - 1]).join(", ")}
            </p>
            <details>
              <summary className="cursor-pointer text-sm font-bold">Team ({assigned.size})</summary>
              <ul className="mt-2 flex flex-col gap-1.5">
                {(people ?? []).map((u) => (
                  <li key={u.id} className="flex items-center justify-between text-sm">
                    <span>{u.full_name || "Unnamed"} <span className="text-muted">· {u.role}</span></span>
                    <form action={setMember}>
                      <input type="hidden" name="project" value={p.id} />
                      <input type="hidden" name="user" value={u.id} />
                      <input type="hidden" name="assign" value={assigned.has(u.id) ? "0" : "1"} />
                      <button className={`h-9 rounded-lg px-3 text-xs font-bold ${assigned.has(u.id) ? "bg-ink text-white" : "border border-[#cfcdc5] bg-white"}`}>
                        {assigned.has(u.id) ? "Assigned" : "Assign"}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </details>
          </article>
        );
      })}

      <form action={createProject} className="card flex flex-col gap-3">
        <h2 className="font-bold">New project</h2>
        <label className="label">Name<input name="name" className="field" required /></label>
        <label className="label">Address<input name="address" className="field" /></label>
        <label className="label">Client<input name="client" className="field" /></label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-[13px] font-semibold text-[#3b3f45]">Work days</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1.5 rounded-lg border border-line bg-field px-2.5 py-2 text-sm">
                <input type="checkbox" name="days" value={i + 1} defaultChecked={i < 5} />
                {d}
              </label>
            ))}
          </div>
        </fieldset>
        <button className="btn-primary">Create project</button>
      </form>
    </>
  );
}
