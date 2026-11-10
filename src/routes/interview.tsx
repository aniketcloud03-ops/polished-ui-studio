import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Microphone,
  MicrophoneSlash,
  PhoneDisconnect,
  CheckCircle,
  ArrowCounterClockwise,
  PaperPlaneRight,
  SpeakerHigh,
  SpeakerSlash,
  Clock,
  Ear,
  Brain,
  ChatTeardropText,
  Info,
} from "@phosphor-icons/react/dist/ssr";
import { DURATIONS, getRole, levelLabel } from "@/lib/roles";
import { validateInterviewSearch } from "@/lib/search";
import { newSessionId, saveSession, type TranscriptLine } from "@/lib/sessions";
import { useMicrophone } from "@/hooks/use-microphone";
import { VoiceOrb, type OrbPhase } from "@/components/voice-orb";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EASE } from "@/components/motion-primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/interview")({
  validateSearch: validateInterviewSearch,
  head: () => ({
    meta: [
      { title: "Live interview — AI Interviewer" },
      { name: "description", content: "Your live voice mock interview session." },
      { property: "og:title", content: "Live interview — AI Interviewer" },
      { property: "og:description", content: "Your live voice mock interview session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InterviewRoom,
});

const ACKS = ["Thanks, that's helpful. ", "Got it. ", "Okay, good. ", "Interesting. ", "Understood. "];

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function InterviewRoom() {
  const search = Route.useSearch();
  const role = getRole(search.role)!;
  const navigate = useNavigate();
  const total = DURATIONS.find((d) => d.id === search.duration)!.questions;
  const typingMode = !!search.typing;

  const mic = useMicrophone();
  const [phase, setPhase] = useState<OrbPhase>("connecting");
  const [qIndex, setQIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [fullText, setFullText] = useState("");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [remaining, setRemaining] = useState(search.duration * 60);
  const [answerSecs, setAnswerSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [draft, setDraft] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [answered, setAnswered] = useState(0);

  const sessionId = useRef(newSessionId());
  const timers = useRef<number[]>([]);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const finished = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  transcriptRef.current = transcript;

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const speak = useCallback(
    (text: string, onEnd: () => void) => {
      const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
      if (!voiceOn || !synth) return onEnd();
      try {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.02;
        let ended = false;
        const done = () => {
          if (ended) return;
          ended = true;
          onEnd();
        };
        u.onend = done;
        u.onerror = done;
        synth.speak(u);
        later(done, text.split(" ").length * 420 + 1500);
      } catch {
        onEnd();
      }
    },
    [voiceOn],
  );

  const ask = useCallback(
    (i: number) => {
      const intro =
        i === 0
          ? `Hi, I'm your interviewer for the ${role.title} role. We'll go through ${total} questions. Take your time. `
          : ACKS[i % ACKS.length];
      const text = intro + role.questions[i % role.questions.length];
      setQIndex(i);
      setFullText(text);
      setCaption("");
      setPhase("speaking");

      const words = text.split(" ");
      let captionDone = false;
      let voiceDone = false;
      const maybeListen = () => {
        if (!captionDone || !voiceDone) return;
        setTranscript((t) => [...t, { speaker: "ai", text }]);
        setAnswerSecs(0);
        setPhase("listening");
      };
      words.forEach((_, w) =>
        later(() => {
          setCaption(words.slice(0, w + 1).join(" "));
          if (w === words.length - 1) {
            captionDone = true;
            later(maybeListen, 350);
          }
        }, 180 + w * 85),
      );
      speak(text, () => {
        voiceDone = true;
        maybeListen();
      });
    },
    [role, total, speak],
  );

  const finish = useCallback(
    (lines: TranscriptLine[], count: number) => {
      if (finished.current) return;
      finished.current = true;
      clearTimers();
      window.speechSynthesis?.cancel();
      mic.stop();
      setPhase("done");
      saveSession({
        id: sessionId.current,
        roleId: role.id,
        level: search.level,
        duration: search.duration,
        createdAt: new Date().toISOString(),
        answered: count,
        totalQuestions: total,
        transcript: lines,
      });
      later(() => navigate({ to: "/interviews/$id", params: { id: sessionId.current }, search: { fresh: true } }), 1800);
    },
    [mic, navigate, role.id, search.level, search.duration, total],
  );

  // Boot: connect then ask first question.
  useEffect(() => {
    if (!typingMode) mic.request();
    later(() => ask(0), 2000);
    return () => {
      clearTimers();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown
  useEffect(() => {
    if (phase === "connecting" || phase === "done") return;
    const t = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          finish(transcriptRef.current, answered);
          return 0;
        }
        return r - 1;
      });
      setAnswerSecs((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase, finish, answered]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, phase]);

  const submitAnswer = (typed?: string) => {
    if (phase !== "listening") return;
    const text = typed?.trim() || `Spoken answer · ${fmt(answerSecs)}`;
    const next = [...transcript, { speaker: "you" as const, text }];
    const count = answered + 1;
    setTranscript(next);
    setAnswered(count);
    setDraft("");
    setPhase("thinking");
    if (count >= total) {
      later(() => finish(next, count), 1200);
    } else {
      later(() => ask(qIndex + 1), 1500);
    }
  };

  const repeat = () => {
    if (phase !== "listening") return;
    clearTimers();
    setTranscript((t) => t.slice(0, -1));
    ask(qIndex);
  };

  const toggleMute = () => {
    setMuted((m) => {
      mic.stream.current?.getAudioTracks().forEach((t) => (t.enabled = m));
      return !m;
    });
  };

  const guidance = {
    connecting: { icon: Brain, title: "Connecting to your interviewer…", text: "This takes a couple of seconds." },
    speaking: { icon: Ear, title: "Listen to the question", text: "The interviewer is speaking. You'll answer next." },
    listening: {
      icon: Microphone,
      title: typingMode ? "Your turn — type your answer" : "Your turn — answer out loud",
      text: typingMode
        ? "Write your answer in the box on the right, then press Send."
        : "Speak naturally. When you've finished, press “I'm done answering”.",
    },
    thinking: { icon: Brain, title: "The interviewer is thinking…", text: "Preparing the next question based on your answer." },
    done: { icon: CheckCircle, title: "Interview complete", text: "Creating your report…" },
  }[phase];
  const GuideIcon = guidance.icon;

  const urgent = remaining <= 60;

  return (
    <div className="relative min-h-screen overflow-hidden bg-stage text-stage-foreground">
      <div className="pointer-events-none absolute inset-0 bg-dusk" />
      <div className="pointer-events-none absolute left-1/2 top-[30%] h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-drift rounded-full bg-sunrise opacity-[0.07] blur-3xl" />

      {/* Top bar */}
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative z-10 border-b border-stage-border/70"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:px-8 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="hidden lg:block">
            <Brand tone="stage" />
          </div>
          <div className="min-w-0 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-destructive/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-stage-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                Live
              </span>
              <h1 className="truncate text-sm font-bold sm:text-base">{role.title}</h1>
              <span className="hidden shrink-0 rounded-full bg-stage-raised px-2.5 py-1 text-xs font-semibold text-stage-muted sm:inline">
                {levelLabel(search.level)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex flex-1 gap-1">
                {Array.from({ length: total }).map((_, i) => (
                  <span key={i} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-stage-raised">
                    <motion.span
                      className="absolute inset-0 origin-left rounded-full bg-sunrise"
                      initial={false}
                      animate={{ scaleX: i < answered ? 1 : i === qIndex && phase !== "connecting" ? 0.45 : 0 }}
                      transition={{ duration: 0.7, ease: EASE }}
                    />
                  </span>
                ))}
              </div>
              <span className="shrink-0 text-xs font-semibold text-stage-muted">
                Question {Math.min(qIndex + 1, total)} of {total}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-sm font-bold transition-colors",
                urgent ? "border-destructive/60 bg-destructive/15 text-stage-foreground" : "border-stage-border bg-stage-raised",
              )}
              aria-label="Time remaining"
            >
              <Clock weight="fill" className={cn("h-4 w-4", urgent ? "text-destructive" : "text-sun-2")} />
              {fmt(remaining)}
            </span>
            <Button variant="stage-danger" size="sm" className="h-10" onClick={() => setConfirmEnd(true)} disabled={phase === "done"}>
              <PhoneDisconnect weight="fill" />
              <span className="hidden sm:inline">End interview</span>
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:py-8">
        {/* Stage */}
        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.15, ease: EASE }}
          className="flex min-w-0 flex-col rounded-[28px] border border-stage-border bg-stage-raised/50 p-5 backdrop-blur sm:p-8"
        >
          {/* Guidance banner — always tells the user what to do now */}
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4, ease: EASE }}
              className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3",
                phase === "listening" ? "border-success/50 bg-success/15" : "border-stage-border bg-stage/60",
              )}
            >
              <GuideIcon weight="fill" className={cn("mt-0.5 h-5 w-5 shrink-0", phase === "listening" ? "text-success" : "text-sun-2")} />
              <div>
                <p className="text-sm font-bold">{guidance.title}</p>
                <p className="text-sm text-stage-muted">{guidance.text}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-1 flex-col items-center justify-center py-6">
            <VoiceOrb phase={phase} level={muted ? 0 : mic.level} />
            <p className="mt-2 h-6 text-sm font-semibold">
              {phase === "connecting" ? (
                <span className="shimmer-text">Connecting voice channel…</span>
              ) : phase === "speaking" ? (
                <span className="text-sun-2">Interviewer speaking</span>
              ) : phase === "listening" ? (
                <span className="text-success">
                  Listening · {fmt(answerSecs)}
                </span>
              ) : phase === "thinking" ? (
                <span className="shimmer-text">Thinking…</span>
              ) : (
                <span className="text-success">Well done!</span>
              )}
            </p>
          </div>

          {/* Current question caption */}
          <div className="min-h-[120px] rounded-2xl border border-stage-border bg-stage/70 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stage-muted">
              {phase === "connecting" ? "Getting ready" : `Question ${qIndex + 1}`}
            </p>
            <p className="mt-2 text-lg font-medium leading-relaxed sm:text-xl">
              {phase === "connecting" ? (
                <span className="text-stage-muted">The first question will appear here.</span>
              ) : (
                <>
                  {caption || fullText.split(" ")[0]}
                  {phase === "speaking" && (
                    <motion.span
                      className="ml-1 inline-block h-5 w-[3px] translate-y-1 rounded-full bg-sun-2"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                    />
                  )}
                </>
              )}
            </p>
          </div>

          {/* Controls */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {!typingMode && (
              <Button
                variant="stage"
                size="icon"
                className={cn("h-14 w-14 rounded-2xl", muted && "border-destructive/60 bg-destructive/20")}
                onClick={toggleMute}
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                title={muted ? "Unmute microphone" : "Mute microphone"}
              >
                {muted ? <MicrophoneSlash weight="fill" className="!size-6" /> : <Microphone weight="fill" className="!size-6" />}
              </Button>
            )}
            <Button
              variant="hero"
              size="lg"
              className="min-w-[220px]"
              disabled={phase !== "listening"}
              onClick={() => submitAnswer(draft)}
            >
              <CheckCircle weight="fill" />
              I'm done answering
            </Button>
            <Button
              variant="stage"
              size="icon"
              className="h-14 w-14 rounded-2xl"
              onClick={repeat}
              disabled={phase !== "listening"}
              aria-label="Repeat the question"
              title="Repeat the question"
            >
              <ArrowCounterClockwise weight="fill" className="!size-6" />
            </Button>
            <Button
              variant="stage"
              size="icon"
              className="h-14 w-14 rounded-2xl"
              onClick={() => {
                if (voiceOn) window.speechSynthesis?.cancel();
                setVoiceOn((v) => !v);
              }}
              aria-label={voiceOn ? "Turn interviewer voice off" : "Turn interviewer voice on"}
              title={voiceOn ? "Interviewer voice on" : "Interviewer voice off"}
            >
              {voiceOn ? <SpeakerHigh weight="fill" className="!size-6" /> : <SpeakerSlash weight="fill" className="!size-6" />}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-stage-muted">
            {!typingMode && <span>Mic {muted ? "muted" : "on"}</span>}
            <span>Repeat question</span>
            <span>Voice {voiceOn ? "on" : "off"}</span>
          </div>
        </motion.section>

        {/* Transcript */}
        <motion.aside
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: EASE }}
          className="flex h-[560px] min-w-0 flex-col overflow-hidden rounded-[28px] border border-stage-border bg-stage-raised/50 backdrop-blur lg:h-auto lg:max-h-[calc(100vh-150px)]"
        >
          <div className="flex items-center justify-between border-b border-stage-border px-5 py-4">
            <div className="flex items-center gap-2">
              <ChatTeardropText weight="fill" className="h-5 w-5 text-sun-2" />
              <h2 className="text-sm font-bold">Conversation</h2>
            </div>
            <span className="text-xs text-stage-muted">{transcript.length} messages</span>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
            {transcript.length === 0 && phase !== "speaking" && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Info weight="fill" className="h-8 w-8 text-stage-muted" />
                <p className="mt-3 max-w-[240px] text-sm text-stage-muted">
                  Everything you and the interviewer say will appear here.
                </p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {transcript.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className={cn("flex flex-col", l.speaker === "you" ? "items-end" : "items-start")}
                >
                  <span className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wider text-stage-muted">
                    {l.speaker === "ai" ? "Interviewer" : "You"}
                  </span>
                  <div
                    className={cn(
                      "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      l.speaker === "ai" ? "rounded-tl-md bg-stage text-stage-foreground" : "rounded-tr-md bg-primary text-primary-foreground",
                    )}
                  >
                    {l.text}
                  </div>
                </motion.div>
              ))}
              {(phase === "speaking" || phase === "thinking") && (
                <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-1.5 px-1 py-2">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-2 w-2 rounded-full bg-stage-muted"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) submitAnswer(draft);
            }}
            className="border-t border-stage-border p-3"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-stage-border bg-stage p-2 focus-within:border-sun-2/60">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (draft.trim()) submitAnswer(draft);
                  }
                }}
                rows={2}
                disabled={phase !== "listening"}
                placeholder={phase === "listening" ? "Prefer typing? Write your answer here…" : "Wait for the question to finish…"}
                className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-stage-foreground outline-hidden placeholder:text-stage-muted disabled:opacity-60"
              />
              <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={phase !== "listening" || !draft.trim()} aria-label="Send answer">
                <PaperPlaneRight weight="fill" />
              </Button>
            </div>
            <p className="mt-2 px-1 text-[11px] text-stage-muted">Enter to send · Shift + Enter for a new line</p>
          </form>
        </motion.aside>
      </main>

      {/* Finale overlay */}
      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 grid place-items-center bg-stage/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: EASE }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.2 }}
                className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-sunrise shadow-ember"
              >
                <CheckCircle weight="fill" className="h-12 w-12 text-stage" />
              </motion.div>
              <h2 className="mt-6 text-3xl font-extrabold">Interview complete</h2>
              <p className="mt-2 text-stage-muted">
                You answered {answered} of {total} questions. Preparing your report…
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End the interview now?</AlertDialogTitle>
            <AlertDialogDescription>
              You've answered {answered} of {total} questions. You'll still get a report, but it's based only on the
              answers you gave.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => finish(transcriptRef.current, answered)}
            >
              End & see report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
