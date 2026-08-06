"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sendError, setSendError] = useState<string | null>(null);

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
    setSendError(error?.message ?? null);
    setStatus(error ? "error" : "sent");
  };

  return (
    <div className="flex h-screen items-center justify-center text-fg">
      <div className="w-full max-w-sm px-6">
        <h1 className="mb-1 text-lg font-semibold">📝 Nodability</h1>
        <p className="mb-6 text-sm text-muted">Sign in with a magic link. ✨</p>

        {callbackError ? (
          <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Sign-in failed: {callbackError}
          </p>
        ) : null}

        {status === "sent" ? (
          <p className="text-sm text-fg">
            📬 Check <span className="font-medium">{email}</span> for a sign-in link.
          </p>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendLink()}
              placeholder="you@example.com"
              className="mb-3 w-full rounded border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={sendLink}
              disabled={status === "sending" || !email.trim()}
              className="w-full rounded bg-accent px-4 py-2 text-sm text-accent-fg disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {status === "error" ? (
              <p className="mt-3 text-sm text-red-600">
                Couldn&apos;t send a link: {sendError ?? "unknown error"}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
