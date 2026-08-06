"use client";

import Link from "next/link";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TaskBoard from "@/components/TaskBoard";
import ChatPanel from "@/components/ChatPanel";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { signOutAction } from "@/lib/actions";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="flex h-screen flex-col text-fg">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">📝 Nodability</h1>
        <div className="flex items-center gap-4">
          <Link href="/ideas" className="text-sm text-muted hover:text-fg">
            💡 Ideas
          </Link>
          <Link href="/week" className="text-sm text-muted hover:text-fg">
            📅 Calendar →
          </Link>
          <Link href="/changelog" className="text-sm text-muted hover:text-fg">
            🎉 What&apos;s new
          </Link>
          <Link href="/templates" className="text-sm text-muted hover:text-fg">
            🧩 Templates
          </Link>
          <ThemeToggle />
          <form action={signOutAction}>
            <button type="submit" className="text-sm text-muted hover:text-fg">
              👋 Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 gap-6 overflow-hidden p-6">
          <Sidebar
            refreshKey={refreshKey}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
          <div className="flex-1 overflow-y-auto pr-4">
            <TaskBoard refreshKey={refreshKey} filterCategory={selectedCategory} />
          </div>
        </div>
        <div className="w-96 shrink-0 border-l border-border p-6">
          <ChatPanel onTasksChanged={bumpRefresh} />
        </div>
      </div>
    </div>
  );
}
