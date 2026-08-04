"use client";

import Link from "next/link";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TaskBoard from "@/components/TaskBoard";
import ChatPanel from "@/components/ChatPanel";
import { signOutAction } from "@/lib/actions";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="flex h-screen flex-col bg-white text-gray-900">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold">Nodability</h1>
        <div className="flex items-center gap-4">
          <Link href="/ideas" className="text-sm text-gray-500 hover:text-gray-900">
            Ideas
          </Link>
          <Link href="/week" className="text-sm text-gray-500 hover:text-gray-900">
            This week →
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Sign out
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
        <div className="w-96 shrink-0 border-l border-gray-200 p-6">
          <ChatPanel onTasksChanged={bumpRefresh} />
        </div>
      </div>
    </div>
  );
}
