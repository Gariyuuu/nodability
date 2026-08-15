"use client";

import { useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { PERSONALITIES, findPersonality } from "@/lib/personalities";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "📋 What do I have today?",
  "📅 What's due this week?",
  "🧹 What haven't I finished?",
];

const PERSONALITY_STORAGE_KEY = "nodability-personality";

function readStoredPersonalityId(): string {
  if (typeof window === "undefined") return PERSONALITIES[0].id;
  return localStorage.getItem(PERSONALITY_STORAGE_KEY) ?? PERSONALITIES[0].id;
}

export default function ChatPanel({ onTasksChanged }: { onTasksChanged: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [personalityId, setPersonalityIdState] = useState<string>(readStoredPersonalityId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const personality = findPersonality(personalityId);

  const setPersonalityId = (id: string) => {
    setPersonalityIdState(id);
    localStorage.setItem(PERSONALITY_STORAGE_KEY, id);
    setPickerOpen(false);
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, personalityId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Request failed");
      }
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + chunk,
          };
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "Something went wrong reaching the assistant. Please try again.",
        };
        return next;
      });
    } finally {
      setSending(false);
      onTasksChanged();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-3 flex items-center gap-2">
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 rounded-lg p-1 text-left hover:bg-surface"
          title="Change AI personality"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm text-accent-fg">
            {personality.emoji}
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight">
              {personality.name} <span className="text-muted">▾</span>
            </span>
            <span className="block text-xs leading-tight text-muted">{personality.tagline}</span>
          </span>
        </button>

        {pickerOpen ? (
          <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-lg border border-border bg-surface p-2 shadow-lg">
            <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Choose a personality
            </p>
            <ul className="space-y-0.5">
              {PERSONALITIES.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setPersonalityId(p.id)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                      p.id === personalityId ? "bg-accent text-accent-fg" : "text-fg hover:bg-bg"
                    }`}
                  >
                    <span>{p.emoji}</span>
                    <span>
                      <span className="block leading-tight">{p.name}</span>
                      <span
                        className={`block text-[11px] leading-tight ${
                          p.id === personalityId ? "text-accent-fg/80" : "text-muted"
                        }`}
                      >
                        {p.tagline}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div>
            <p className="mb-3 text-sm text-muted">{personality.greeting}</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-fg"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-accent text-accent-fg"
                : "bg-surface text-fg"
            }`}
          >
            {m.content ||
              (m.role === "assistant" && sending ? (
                <span className="inline-flex items-center gap-2">
                  <ThinkingOrb state="composing" size={20} aria-label={`${personality.name} is composing a reply`} />
                  <span>{personality.emoji} Thinking…</span>
                </span>
              ) : (
                ""
              ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="e.g. Chem lab report due Friday"
          className="flex-1 rounded border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={() => send()}
          disabled={sending}
          className="rounded bg-accent px-4 py-2 text-sm text-accent-fg disabled:opacity-50"
        >
          Send ✨
        </button>
      </div>
    </div>
  );
}
