import Link from "next/link";
import { CHANGELOG } from "@/lib/changelog";

export default function ChangelogPage() {
  return (
    <div className="flex h-screen flex-col bg-bg text-fg">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">What&apos;s new</h1>
        <Link href="/" className="text-sm text-muted hover:text-fg">
          Back to board →
        </Link>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl space-y-8">
          {CHANGELOG.map((entry) => (
            <div key={entry.version}>
              <div className="mb-1 flex items-baseline gap-2">
                <h2 className="text-sm font-semibold">
                  v{entry.version} — {entry.title}
                </h2>
                <span className="text-xs text-muted">{entry.date}</span>
              </div>
              <ul className="ml-4 list-disc space-y-1 text-sm text-muted">
                {entry.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
