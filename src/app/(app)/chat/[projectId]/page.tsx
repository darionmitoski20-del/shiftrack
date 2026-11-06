import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { ChatRoom, type ChatMessage } from "./ChatRoom";

export default async function ProjectChatPage({ params }: PageProps<"/chat/[projectId]">) {
  const { projectId } = await params;
  const { supabase, profile } = await requireProfile();

  const [{ data: project }, { data: messages }, { data: people }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle(),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<ChatMessage[]>(),
    supabase.from("profiles").select("id, full_name"),
  ]);
  if (!project) notFound();

  const names = Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name || "Unnamed"]));

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href="/chat" aria-label="Back to chats" className="flex h-11 w-11 items-center justify-center text-2xl">‹</Link>
        <h1 className="font-display text-2xl font-bold">{project.name}</h1>
      </div>
      <ChatRoom
        projectId={project.id}
        companyId={profile.company_id!}
        me={profile.id}
        names={names}
        initial={(messages ?? []).reverse()}
      />
    </>
  );
}
