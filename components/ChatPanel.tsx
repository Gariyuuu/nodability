"use client";

import { useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPanel({ onTasksChanged }: { onTasksChanged: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

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
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm text-accent-fg">
          🌱
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight">Nodo</p>
          <p className="text-xs leading-tight text-muted">your task sidekick</p>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Hey — tell me what you've got going on and I&apos;ll get it organized.
          </p>
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
            {m.content || (m.role === "assistant" && sending ? "…" : "")}
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
          onClick={send}
          disabled={sending}
          className="rounded bg-accent px-4 py-2 text-sm text-accent-fg disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
