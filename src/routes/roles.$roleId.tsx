import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Medal,
  ChatsCircle,
  Keyboard,
  Info,
} from "@phosphor-icons/react/dist/ssr";
import { getRole, LEVELS, DURATIONS, type Level, type Duration } from "@/lib/roles";
import { FlowStepper } from "@/components/flow-stepper";
import { Button } from "@/components/ui/button";
import { Reveal, EASE } from "@/components/motion-primitives";
import { cn } from "@/lib/utils";
import { createInterview } from "@/lib/api";
import { DEFAULT_CHARACTER_ID } from "@/lib/characters";

export const Route = createFileRoute("/roles/$roleId")({
  loader: ({ params }) => {
    const role = getRole(params.roleId);
    if (!role) throw notFound();
    return { roleId: role.id, title: role.title, short: role.short };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Role"} mock interview — AI Interviewer` },
      { name: "description", content: loaderData?.short ?? "Set up your voice mock interview." },
      { property: "og:title", content: `${loaderData?.title ?? "Role"} mock interview — AI Interviewer` },
      { property: "og:description", content: loaderData?.short ?? "Set up your voice mock interview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoleSetup,
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-3xl font-extrabold text-foreground">Role not found</h1>
      <p className="mt-2 text-muted-foreground">That role doesn't exist. Pick one from the list.</p>
      <Button asChild className="mt-6">
        <Link to="/" hash="roles">Browse roles</Link>
      </Button>
    </div>
  ),
});

function RoleSetup() {
  const { roleId } = Route.useLoaderData();
  const role = getRole(roleId)!;
  const Icon = role.icon;
  const navigate = useNavigate();
  const [level, setLevel] = useState<Level>("mid");
  const [duration, setDuration] = useState<Duration>(30);
  const dur = DURATIONS.find((d) => d.id === duration)!;
  const lvl = LEVELS.find((l) => l.id === level)!;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-canvas" />
      <div className="relative mx-auto max-w-7xl px-5 pt-8 sm:px-8">
        <FlowStepper current={1} />

        <Link
          to="/"
          hash="roles"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft weight="bold" className="h-4 w-4" />
          Change role
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
          {/* Left: what this interview covers */}
          <div className="min-w-0">
            <Reveal className="flex items-start gap-5">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[20px] bg-sunrise shadow-ember">
                <Icon weight="fill" className="h-8 w-8 text-foreground" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{role.category}</p>
                <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">{role.title}</h1>
                <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">{role.short}</p>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="mt-10 rounded-[24px] border border-border bg-card p-6 shadow-soft sm:p-8">
              <div className="flex items-center gap-3">
                <ChatsCircle weight="fill" className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-bold text-foreground">What you'll be asked about</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Questions are spread across these areas. The bar shows how much each one counts toward your score.
              </p>
              <ul className="mt-6 space-y-4">
                {role.topics.map((t, i) => (
                  <li key={t.name}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-[15px] font-semibold text-foreground">{t.name}</span>
                      <span className="font-mono text-sm font-bold text-muted-foreground">{t.weight}%</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        className="h-full rounded-full bg-sunrise"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${t.weight * 2.5}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.2 + i * 0.1, ease: EASE }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.2} className="mt-6 rounded-[24px] border border-border bg-card p-6 shadow-soft sm:p-8">
              <div className="flex items-center gap-3">
                <Medal weight="fill" className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  What a <span className="text-primary">{lvl.label.toLowerCase()}</span> candidate shows
                </h2>
              </div>
              <AnimatePresence mode="wait">
                <motion.ul
                  key={level}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="mt-5 grid gap-3 sm:grid-cols-3"
                >
                  {role.expectations[level].map((e) => (
                    <li key={e} className="flex items-start gap-2.5 rounded-2xl bg-success-soft/70 p-4">
                      <CheckCircle weight="fill" className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                      <span className="text-sm font-medium leading-snug text-foreground">{e}</span>
                    </li>
                  ))}
                </motion.ul>
              </AnimatePresence>
            </Reveal>
          </div>

          {/* Right: setup panel */}
          <Reveal delay={0.15} className="lg:sticky lg:top-24">
            <div className="rounded-[28px] border border-border bg-card p-6 shadow-lift sm:p-8">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Step 2 · Set up</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Your interview</h2>

              <fieldset className="mt-7">
                <legend className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-foreground text-[11px] text-background">A</span>
                  Your experience level
                </legend>
                <div className="mt-3 space-y-2">
                  {LEVELS.map((l) => (
                    <OptionRow
                      key={l.id}
                      selected={level === l.id}
                      onClick={() => setLevel(l.id)}
                      title={l.label}
                      meta={l.years}
                      desc={l.blurb}
                      group="level"
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-7">
                <legend className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-foreground text-[11px] text-background">B</span>
                  How much time do you have?
                </legend>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {DURATIONS.map((d) => {
                    const on = duration === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => setDuration(d.id)}
                        aria-pressed={on}
                        className={cn(
                          "relative rounded-2xl border p-3 text-left transition-all duration-300",
                          on ? "border-primary bg-primary-soft/60" : "border-border hover:border-border-strong",
                        )}
                      >
                        <Clock weight="fill" className={cn("h-5 w-5", on ? "text-primary" : "text-muted-foreground")} />
                        <p className="mt-2 text-base font-extrabold text-foreground">{d.label}</p>
                        <p className="text-xs text-muted-foreground">{d.blurb}</p>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-7 rounded-2xl bg-secondary p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`${level}-${duration}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="mt-1 text-[15px] font-semibold text-foreground"
                  >
                    {lvl.label} · {dur.label} · about {dur.questions} questions
                  </motion.p>
                </AnimatePresence>
              </div>

              <Button
                variant="hero"
                size="lg"
                className="mt-6 w-full"
                onClick={async () => {
                  await createInterview({ roleId: role.id, level, duration, characterId: DEFAULT_CHARACTER_ID });
                  navigate({ to: "/interviews" });
                }}
              >
                Continue to mic check
                <ArrowRight weight="bold" />
              </Button>

              <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Keyboard weight="fill" className="h-4 w-4 shrink-0" />
                  Prefer typing? You can type answers during the interview too.
                </li>
                <li className="flex items-center gap-2">
                  <Info weight="fill" className="h-4 w-4 shrink-0" />
                  You can end the interview at any time and still get a report.
                </li>
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  selected,
  onClick,
  title,
  meta,
  desc,
  group,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  meta: string;
  desc: string;
  group: string;
}) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      className={cn(
        "relative flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300",
        selected ? "border-primary bg-primary-soft/60" : "border-border hover:border-border-strong hover:bg-secondary/50",
      )}
    >
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
          selected ? "border-primary" : "border-border-strong",
        )}
      >
        {selected && (
          <motion.span layoutId={`${group}-dot`} className="h-2.5 w-2.5 rounded-full bg-primary" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-bold text-foreground">{title}</span>
          <span className="font-mono text-xs font-semibold text-muted-foreground">{meta}</span>
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}
