import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlass,
  ArrowRight,
  UserCircleGear,
  SlidersHorizontal,
  Microphone,
  ChatCircleText,
  ChartPieSlice,
  ListChecks,
  Target,
  XCircle,
  PlayCircle,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";
import { ROLES, CATEGORIES, type Category } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Reveal, SplitTitle, EASE } from "@/components/motion-primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Interviewer — Practise technical interviews out loud" },
      {
        name: "description",
        content:
          "Pick one of 15 engineering roles, talk with a real-time AI interviewer, and get a scored report with a study plan.",
      },
      { property: "og:title", content: "AI Interviewer — Practise technical interviews out loud" },
      {
        property: "og:description",
        content: "Voice mock interviews for 15 engineering roles with instant scored feedback.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const HOW = [
  { icon: UserCircleGear, title: "Pick a role", text: "Choose the job you're preparing for." },
  { icon: SlidersHorizontal, title: "Set level & time", text: "Junior to senior, 15 to 45 minutes." },
  { icon: Microphone, title: "Check your mic", text: "A 30-second sound check. That's it." },
  { icon: ChatCircleText, title: "Talk it through", text: "Answer out loud, like a real interview." },
  { icon: ChartPieSlice, title: "Get your report", text: "Score, strengths and a study plan." },
];

function Index() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <RoleCatalog />
      <ReportTeaser />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden grain">
      <div className="pointer-events-none absolute inset-0 bg-canvas" />
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] animate-drift rounded-full bg-sunrise opacity-25 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-24">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card/70 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Real-time voice interviewer · 15 roles
          </motion.span>

          <h1 className="mt-6 text-[clamp(2.6rem,6vw,4.75rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-foreground">
            <SplitTitle text="Practise your next" delay={0.1} />
            <br />
            <SplitTitle text="tech interview" delay={0.3} />{" "}
            <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
              <motion.span
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                transition={{ duration: 1.1, delay: 0.5, ease: EASE }}
                className="inline-block font-display text-[1.12em] font-normal italic tracking-[-0.01em] text-sunrise"
              >
                out loud.
              </motion.span>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.75, ease: EASE }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            An AI interviewer asks you real questions for your role, listens to your spoken answers, and gives you an
            honest score with a clear plan to improve.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Button asChild variant="hero" size="lg">
              <a href="#roles">
                <PlayCircle weight="fill" />
                Choose a role to start
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#how">See how it works</a>
            </Button>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.1 }}
            className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6"
          >
            {[
              ["15", "Engineering roles"],
              ["3", "Seniority levels"],
              ["5", "Scored skills"],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="text-3xl font-extrabold tracking-tight text-foreground">{n}</dt>
                <dd className="mt-1 text-xs font-medium text-muted-foreground">{l}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

const PREVIEW_LINES = [
  { who: "ai", text: "How would you chunk long PDF manuals for retrieval?" },
  { who: "you", text: "I'd split by headings first, then cap chunks around 500 tokens with overlap…" },
  { who: "ai", text: "Good. How would you check that retrieval actually improved?" },
] as const;

function HeroPreview() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % (PREVIEW_LINES.length + 2)), 2200);
    return () => clearInterval(t);
  }, []);
  const visible = PREVIEW_LINES.slice(0, Math.min(step + 1, PREVIEW_LINES.length));
  const speaking = visible[visible.length - 1]?.who === "ai";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ duration: 1.3, delay: 0.4, ease: EASE }}
      style={{ perspective: 1200 }}
      className="relative"
    >
      <div className="relative overflow-hidden rounded-[28px] border border-stage-border bg-dusk p-6 shadow-lift sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-stage-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            Live · AI / GenAI Engineer
          </div>
          <span className="rounded-full bg-stage-raised px-3 py-1 font-mono text-xs text-stage-foreground">
            12:48
          </span>
        </div>

        <div className="my-8 flex items-center justify-center">
          <div className="relative h-36 w-36">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-sunrise" />
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-sunrise [animation-delay:1.1s]" />
            <motion.span
              animate={{ scale: speaking ? [1, 1.07, 0.98, 1.05, 1] : [1, 1.02, 1] }}
              transition={{ duration: speaking ? 1.4 : 3, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-sunrise shadow-ember"
            />
            <div className="absolute inset-0 grid place-items-center">
              <Waveline active={speaking} />
            </div>
          </div>
        </div>
        <p className="text-center text-sm font-semibold text-stage-foreground">
          {speaking ? "Interviewer is speaking…" : "Your turn — answer out loud"}
        </p>

        <div className="mt-6 space-y-2.5">
          <AnimatePresence initial={false}>
            {visible.map((l) => (
              <motion.div
                key={l.text}
                layout
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className={cn(
                  "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  l.who === "ai"
                    ? "bg-stage-raised text-stage-foreground"
                    : "ml-auto bg-primary text-primary-foreground",
                )}
              >
                {l.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 1.3, ease: EASE }}
        className="absolute -bottom-6 -left-4 flex animate-float items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lift sm:-left-10"
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-success-soft">
          <Target weight="fill" className="h-5 w-5 text-success" />
        </span>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Readiness score</p>
          <p className="text-lg font-extrabold text-foreground">78 / 100</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Waveline({ active }: { active: boolean }) {
  return (
    <div className="flex h-10 items-center gap-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-1.5 rounded-full bg-foreground/80"
          animate={{ height: active ? [8, 28 - Math.abs(3 - i) * 4, 10, 22, 8] : 6 }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8">
      <Reveal className="max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">How it works</p>
        <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Five simple steps. <span className="font-display font-normal italic">No setup.</span>
        </h2>
      </Reveal>

      <div className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: EASE }}
          className="absolute left-8 right-8 top-[46px] hidden h-[2px] origin-left bg-sunrise lg:block"
        />
        {HOW.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.title} delay={0.1 * i} className="relative">
              <div className="h-full rounded-[20px] border border-border bg-card p-6 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-center justify-between">
                  <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft">
                    <Icon weight="fill" className="h-6 w-6 text-primary" />
                  </span>
                  <span className="font-mono text-sm font-bold text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function RoleCatalog() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ROLES.filter((r) => {
      if (cat !== "All" && r.category !== cat) return false;
      if (!q) return true;
      return [r.title, r.short, ...r.skills].join(" ").toLowerCase().includes(q);
    });
  }, [query, cat]);

  return (
    <section id="roles" className="scroll-mt-20 border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Step 1 · Choose a role</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Which job are you <span className="font-display font-normal italic">preparing for?</span>
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Click any role to see the topics it covers. You'll set your level and time on the next screen.
            </p>
          </Reveal>

          <Reveal delay={0.15} className="w-full lg:max-w-sm">
            <label className="group relative flex items-center">
              <MagnifyingGlass
                weight="fill"
                className="pointer-events-none absolute left-4 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a role or skill — e.g. React, Kafka"
                aria-label="Search roles"
                className="h-14 w-full rounded-2xl border border-border-strong bg-card pl-12 pr-11 text-[15px] text-foreground shadow-soft outline-hidden transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 text-muted-foreground hover:text-foreground"
                >
                  <XCircle weight="fill" className="h-5 w-5" />
                </button>
              )}
            </label>
          </Reveal>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {(["All", ...CATEGORIES] as const).map((c) => {
            const on = cat === c;
            const count = c === "All" ? ROLES.length : ROLES.filter((r) => r.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  on ? "text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {on && (
                  <motion.span
                    layoutId="cat-pill"
                    className="absolute inset-0 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative">
                  {c} <span className="opacity-60">{count}</span>
                </span>
              </button>
            );
          })}
        </div>

        <motion.div layout className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((role, i) => {
              const Icon = role.icon;
              return (
                <motion.div
                  key={role.id}
                  layout
                  initial={{ opacity: 0, y: 30, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.55, delay: Math.min(i, 8) * 0.04, ease: EASE }}
                >
                  <Link
                    to="/roles/$roleId"
                    params={{ roleId: role.id }}
                    className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-border bg-card p-6 shadow-soft transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lift"
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-sunrise transition-transform duration-700 group-hover:scale-x-100" />
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft transition-all duration-500 group-hover:bg-sunrise">
                        <Icon weight="fill" className="h-6 w-6 text-primary transition-colors group-hover:text-foreground" />
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                        {role.category}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">{role.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{role.short}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {role.skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto" />
                    <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <ListChecks weight="fill" className="h-4 w-4" />
                        {role.topics.length} topic areas
                      </span>
                      <span className="flex items-center gap-1.5 text-sm font-bold text-primary">
                        Select
                        <ArrowRight weight="bold" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-[20px] border border-dashed border-border-strong bg-card p-10 text-center"
          >
            <p className="font-semibold text-foreground">No roles match “{query}”.</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a broader skill like “Python” or “Cloud”.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setQuery("");
                setCat("All");
              }}
            >
              Show all roles
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function ReportTeaser() {
  const items = [
    { icon: Target, title: "One clear score", text: "An overall readiness score out of 100 with a realistic range." },
    { icon: ChartPieSlice, title: "Five skill breakdown", text: "Depth, problem solving, communication, systems and experience." },
    { icon: Lightning, title: "A study plan", text: "Six focused steps, each with time estimates, to raise your score." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="relative overflow-hidden rounded-[32px] bg-dusk p-8 sm:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 animate-drift rounded-full bg-sunrise opacity-30 blur-3xl" />
        <Reveal className="relative max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-sun-2">After every interview</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-stage-foreground sm:text-5xl">
            Know exactly <span className="font-display font-normal italic text-sun-3">what to fix next.</span>
          </h2>
        </Reveal>
        <div className="relative mt-10 grid gap-4 md:grid-cols-3">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <Reveal key={it.title} delay={0.12 * i}>
                <div className="h-full rounded-[20px] border border-stage-border bg-stage-raised/70 p-6 backdrop-blur">
                  <Icon weight="fill" className="h-7 w-7 text-sun-2" />
                  <h3 className="mt-4 text-lg font-bold text-stage-foreground">{it.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-stage-muted">{it.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={0.3} className="relative mt-10 flex flex-wrap gap-3">
          <Button asChild variant="hero" size="lg">
            <a href="#roles">
              Start a free practice
              <ArrowRight weight="bold" />
            </a>
          </Button>
          <Button asChild variant="stage" size="lg">
            <Link to="/interviews">
              View sample reports
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
