import Link from "next/link";
import { isManager, requireProfile } from "@/lib/session";

export default async function ChatListPage() {
  const { supabase, profile } = await requireProfile();

  // Managers see every project's chat; others only projects they are assigned to.
  const { data } = isManager(profile.role)
    ? await supabase.from("projects").select("id, name, address").eq("archived", false).order("name")
    : await supabase
        .from("project_members")
        .select("projects(id, name, address, archived)")
        .eq("user_id", profile.id)
        .then((r) => ({
          data: (r.data ?? [])
            .map((m) => m.projects as unknown as { id: string; name: string; address: string | null; archived: boolean } | null)
            .filter((p) => !!p && !p.archived) as { id: string; name: string; address: string | null }[],
        }));

  return (
    <>
      <h1 className="font-display text-[28px] font-bold">Chat</h1>
      {(data ?? []).length === 0 && <p className="card text-muted">No project chats yet.</p>}
      {(data ?? []).map((p) => (
        <Link key={p.id} href={`/chat/${p.id}`} className="card flex items-center justify-between">
          <div className="flex flex-col">
            <b>{p.name}</b>
            {p.address && <span className="text-sm text-muted">{p.address}</span>}
          </div>
          <span aria-hidden="true" className="text-xl text-muted">›</span>
        </Link>
      ))}
    </>
  );
}
