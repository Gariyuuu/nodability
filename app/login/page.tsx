"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const sendLink = async () => {
    const trimmed = email.trim();
    if (!trimmed || status === "sending") return;

    setStatus("sending");
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setStatus(error ? "error" : "sent");
  };

  return (
    <div className="flex h-screen items-center justify-center bg-white text-gray-900">
      <div className="w-full max-w-sm px-6">
        <h1 className="mb-1 text-lg font-semibold">Nodability</h1>
        <p className="mb-6 text-sm text-gray-500">Sign in with a magic link.</p>

        {status === "sent" ? (
          <p className="text-sm text-gray-700">
            Check <span className="font-medium">{email}</span> for a sign-in link.
          </p>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendLink()}
              placeholder="you@example.com"
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
            <button
              onClick={sendLink}
              disabled={status === "sending" || !email.trim()}
              className="w-full rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {status === "error" ? (
              <p className="mt-3 text-sm text-red-600">
                Couldn&apos;t send a link for that address.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
