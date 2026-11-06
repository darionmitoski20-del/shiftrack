"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

type Props = {
  projectId: string;
  companyId: string;
  me: string;
  names: Record<string, string>;
  initial: ChatMessage[];
};

export function ChatRoom({ projectId, companyId, me, names, initial }: Props) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const [supabase] = useState(createClient);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({ company_id: companyId, project_id: projectId, sender_id: me, body })
      .select("id, sender_id, body, created_at")
      .single<ChatMessage>();
    setSending(false);
    if (error) {
      setError("Message not sent. Try again.");
      return;
    }
    setDraft("");
    setMessages((prev) => (prev.some((p) => p.id === data.id) ? prev : [...prev, data]));
  }

  return (
    <>
      <div className="flex flex-col gap-2.5 pb-20">
        {messages.length === 0 && <p className="card text-muted">No messages yet. Say hello to the team.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          const time = new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-[15px] ${mine ? "self-end rounded-br-sm bg-ink text-white" : "self-start rounded-bl-sm border border-line bg-white"}`}
            >
              {!mine && <div className="text-xs font-bold text-muted">{names[m.sender_id] ?? "Unknown"} · {time}</div>}
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              {mine && <div className="text-right text-[11px] text-[#c9c7c0]">{time}</div>}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={send}
        className="fixed inset-x-0 bottom-[76px] mx-auto flex max-w-md items-center gap-2 border-t border-line bg-white px-3 py-2.5"
      >
        <label className="flex-1">
          <span className="sr-only">Message</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={error ?? "Message"}
            className="h-11 w-full rounded-full border border-[#cfcdc5] bg-field px-4 text-[15px]"
          />
        </label>
        <button
          aria-label="Send"
          disabled={sending}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
          </svg>
        </button>
      </form>
    </>
  );
}
