import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Microphone,
  MicrophoneSlash,
  SpeakerHigh,
  Record,
  PlayCircle,
  ShieldCheck,
  Headphones,
  SpeakerSimpleSlash,
  Timer,
  Keyboard,
} from "@phosphor-icons/react/dist/ssr";
import { getRole, levelLabel } from "@/lib/roles";
import { validateInterviewSearch } from "@/lib/search";
import { useMicrophone } from "@/hooks/use-microphone";
import { FlowStepper } from "@/components/flow-stepper";
import { Button } from "@/components/ui/button";
import { Reveal, EASE } from "@/components/motion-primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/check")({
  validateSearch: validateInterviewSearch,
  head: () => ({
    meta: [
      { title: "Microphone check — AI Interviewer" },
      { name: "description", content: "Test your microphone and audio before your voice mock interview." },
      { property: "og:title", content: "Microphone check — AI Interviewer" },
      { property: "og:description", content: "Test your microphone and audio before your voice mock interview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckPage,
});

const BARS = 28;

function CheckPage() {
  const search = Route.useSearch();
  const role = getRole(search.role)!;
  const navigate = useNavigate();
  const mic = useMicrophone();
  const [consent, setConsent] = useState(false);
  const [rec, setRec] = useState<"idle" | "recording" | "ready" | "playing">("idle");
  const [countdown, setCountdown] = useState(3);
  const audioUrl = useRef<string | null>(null);

  const granted = mic.status === "granted";
  const pct = Math.round(mic.level * 100);
  const levelOk = pct >= 12;

  const recordTest = () => {
    const stream = mic.stream.current;
    if (!stream || typeof MediaRecorder === "undefined") return;
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => chunks.push(e.data);
    mr.onstop = () => {
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType }));
      setRec("ready");
    };
    mr.start();
    setRec("recording");
    setCountdown(3);
    let n = 3;
    const t = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) {
        clearInterval(t);
        mr.stop();
      }
    }, 1000);
  };

  const playTest = () => {
    if (!audioUrl.current) return;
    const a = new Audio(audioUrl.current);
    setRec("playing");
    a.onended = () => setRec("ready");
    a.play().catch(() => setRec("ready"));
  };

  const enter = (typing = false) => {
    mic.stop();
    navigate({ to: "/interview", search: { ...search, typing: typing || undefined } });
  };

  const steps = [granted, rec === "ready" || rec === "playing" || levelOk, consent];
  const doneCount = steps.filter(Boolean).length;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-canvas" />
      <div className="relative mx-auto max-w-7xl px-5 pt-8 sm:px-8">
        <FlowStepper current={2} />

        <Link
          to="/roles/$roleId"
          params={{ roleId: role.id }}
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft weight="bold" className="h-4 w-4" />
          Back to setup
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Reveal>
            <div className="rounded-[28px] border border-border bg-card p-6 shadow-lift sm:p-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Step 3 · Mic check</p>
                  <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                    Let's make sure we can hear you
                  </h1>
                  <p className="mt-2 text-muted-foreground">
                    {role.title} · {levelLabel(search.level)} · {search.duration} min
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12">
                    <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                      <circle cx="18" cy="18" r="15" className="fill-none stroke-secondary" strokeWidth="4" />
                      <motion.circle
                        cx="18"
                        cy="18"
                        r="15"
                        className="fill-none stroke-success"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="94.2"
                        animate={{ strokeDashoffset: 94.2 - (94.2 * doneCount) / 3 }}
                        transition={{ duration: 0.8, ease: EASE }}
                      />
                    </svg>
                    <span className="absolute inset-0 grid place-items-center text-xs font-bold text-foreground">
                      {doneCount}/3
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">checks done</span>
                </div>
              </div>

              <div className="mt-10 space-y-4">
                {/* 1. Permission */}
                <CheckItem n={1} done={granted} title="Allow microphone access" active={!granted}>
                  {mic.status === "denied" || mic.status === "unsupported" ? (
                    <div className="flex flex-col gap-3 rounded-2xl bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <MicrophoneSlash weight="fill" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                        <p className="text-sm text-foreground">
                          {mic.status === "unsupported"
                            ? "This browser can't use the microphone here."
                            : "Microphone was blocked. Click the lock icon in your address bar, allow the microphone, then try again."}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={mic.request}>
                        Try again
                      </Button>
                    </div>
                  ) : granted ? (
                    <p className="text-sm font-medium text-success">Microphone connected.</p>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Button onClick={mic.request} disabled={mic.status === "requesting"}>
                        <Microphone weight="fill" />
                        {mic.status === "requesting" ? "Waiting for permission…" : "Allow microphone"}
                      </Button>
                      <p className="text-sm text-muted-foreground">Your browser will ask for permission.</p>
                    </div>
                  )}
                </CheckItem>

                {/* 2. Level */}
                <CheckItem
                  n={2}
                  done={steps[1]}
                  title="Say a few words"
                  active={granted && !steps[1]}
                  disabled={!granted}
                >
                  <div className="rounded-2xl bg-secondary/70 p-5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <SpeakerHigh weight="fill" className="h-5 w-5 text-primary" />
                        Input level
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-bold",
                          !granted
                            ? "bg-card text-muted-foreground"
                            : levelOk
                              ? "bg-success-soft text-success"
                              : "bg-warning-soft text-foreground",
                        )}
                      >
                        {!granted ? "Waiting" : levelOk ? "Sounds great" : "Speak a little louder"}
                      </span>
                    </div>
                    <div className="mt-4 flex h-16 items-end gap-[3px]" aria-hidden>
                      {Array.from({ length: BARS }).map((_, i) => {
                        const center = 1 - Math.abs(i - BARS / 2) / (BARS / 2);
                        const h = granted ? Math.max(0.08, Math.min(1, mic.level * 2.2 * (0.45 + center * 0.75))) : 0.08;
                        const lit = i / BARS < mic.level * 1.6;
                        return (
                          <motion.span
                            key={i}
                            className={cn("flex-1 rounded-full", lit ? "bg-sunrise" : "bg-border-strong")}
                            animate={{ height: `${h * 100}%` }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button size="sm" variant="outline" disabled={!granted || rec === "recording"} onClick={recordTest}>
                        <Record weight="fill" className={cn(rec === "recording" && "animate-pulse text-destructive")} />
                        {rec === "recording" ? `Recording… ${countdown}s` : "Record a 3-second test"}
                      </Button>
                      <AnimatePresence>
                        {(rec === "ready" || rec === "playing") && (
                          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                            <Button size="sm" variant="secondary" onClick={playTest} disabled={rec === "playing"}>
                              <PlayCircle weight="fill" />
                              {rec === "playing" ? "Playing…" : "Play it back"}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </CheckItem>

                {/* 3. Consent */}
                <CheckItem n={3} done={consent} title="Agree to audio recording" active={steps[1] && !consent}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 transition-colors hover:bg-secondary/50">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--primary)]"
                    />
                    <span className="text-sm leading-relaxed text-foreground">
                      I agree that my voice is captured to transcribe answers, run the live interview and create my
                      report. Audio is only used for this practice session.
                    </span>
                  </label>
                </CheckItem>
              </div>

              <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => enter(true)}
                  disabled={!consent}
                  className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  <Keyboard weight="fill" className="h-4 w-4" />
                  No mic? Type your answers instead
                </button>
                <Button variant="hero" size="lg" disabled={!granted || !consent} onClick={() => enter(false)}>
                  Start interview
                  <ArrowRight weight="bold" />
                </Button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <aside className="rounded-[24px] border border-border bg-card p-6 shadow-soft">
              <h2 className="text-lg font-bold text-foreground">Tips for a great session</h2>
              <ul className="mt-5 space-y-5">
                {[
                  { icon: SpeakerSimpleSlash, t: "Find a quiet room", d: "Background noise makes answers harder to understand." },
                  { icon: Headphones, t: "Use headphones", d: "Stops the interviewer's voice from echoing back." },
                  { icon: Timer, t: "Pause when you're done", d: "Wait about a second — the interviewer will reply." },
                  { icon: ShieldCheck, t: "Think out loud", d: "Explaining your reasoning earns more points than a short answer." },
                ].map(({ icon: Icon, t, d }) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft">
                      <Icon weight="fill" className="h-5 w-5 text-primary" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">{t}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function CheckItem({
  n,
  done,
  title,
  active,
  disabled,
  children,
}: {
  n: number;
  done: boolean;
  title: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      animate={{ opacity: disabled ? 0.5 : 1 }}
      className={cn(
        "rounded-[20px] border p-5 transition-colors duration-500",
        active ? "border-primary/50 bg-primary-soft/25" : "border-border",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors duration-500",
            done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.span key="d" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}>
                <CheckCircle weight="fill" className="h-5 w-5" />
              </motion.span>
            ) : (
              <motion.span key="n" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                {n}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      <div className={cn("mt-4 pl-11", disabled && "pointer-events-none")}>{children}</div>
    </motion.div>
  );
}
