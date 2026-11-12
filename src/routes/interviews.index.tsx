import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { listSessions, type Session } from "@/lib/sessions";
import { getRole, levelLabel } from "@/lib/roles";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/interviews/")({
  head: () => ({
    meta: [
      { title: "My interviews — AI Interviewer" },
      { name: "description", content: "Your past and upcoming voice mock interviews." },
      { property: "og:title", content: "My interviews — AI Interviewer" },
      { property: "og:description", content: "Your past and upcoming voice mock interviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InterviewsPage,
});

function InterviewsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  useEffect(() => setSessions(listSessions()), []);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">History</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-foreground">My interviews</h1>
      <ul className="mt-8 space-y-3">
        {sessions.map((s) => {
          const role = getRole(s.roleId);
          return (
            <li
              key={s.id}
              className="flex items-center gap-4 rounded-[20px] border border-border bg-card p-5 shadow-soft"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft">
                <ClockCounterClockwise weight="fill" className="h-6 w-6 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-foreground">{role?.title ?? s.roleId}</p>
                <p className="text-sm text-muted-foreground">
                  {levelLabel(s.level)} · {s.duration} min · {new Date(s.createdAt).toLocaleDateString()}
                  {s.sample ? " · Sample" : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <Button asChild variant="hero" className="mt-8">
        <Link to="/" hash="roles">Start a new interview</Link>
      </Button>
    </div>
  );
}
