import { getRole } from "./roles";
import type { Session, TranscriptLine } from "./sessions";

export type DimensionKey =
  | "technical_accuracy"
  | "depth"
  | "problem_solving"
  | "communication"
  | "practical_experience";

export const DIMENSIONS: { key: DimensionKey; label: string; hint: string }[] = [
  { key: "technical_accuracy", label: "Technical accuracy", hint: "Were your facts and solutions correct?" },
  { key: "depth", label: "Depth", hint: "How far below the surface did you go?" },
  { key: "problem_solving", label: "Problem solving", hint: "How you broke problems down and reasoned" },
  { key: "communication", label: "Communication", hint: "Clarity and structure of your answers" },
  { key: "practical_experience", label: "Practical experience", hint: "Concrete examples from real work" },
];

export interface StudyStep {
  title: string;
  detail: string;
  minutes?: number;
}

export interface Report {
  overall: number;
  readiness: string;
  dimensions: { key: DimensionKey; label: string; score: number }[];
  strengths: string[];
  gaps: string[];
  studyPlan: StudyStep[];
  transcript: TranscriptLine[];
}

export type ReportResult = { status: "pending" } | { status: "ready"; report: Report; mock: boolean };

/** Readiness label shown next to the overall score. */
export function readinessLabel(score: number): string {
  if (score >= 80) return "Interview-ready";
  if (score >= 65) return "Almost ready";
  if (score >= 50) return "Needs practice";
  return "Early stage";
}

const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Accepts the backend's JSON (snake_case or camelCase, object or array dimensions). */
export function normalizeReport(raw: Record<string, unknown>, fallbackTranscript: TranscriptLine[] = []): Report {
  const r = raw as Record<string, any>;
  const overall = clampScore(Number(r["overall_score"] ?? r["overall"] ?? r["score"] ?? 0));
  const rawDims = r["dimensions"] ?? r["dimension_scores"] ?? {};
  const dimMap: Record<string, number> = Array.isArray(rawDims)
    ? Object.fromEntries(rawDims.map((d: any) => [String(d.key ?? d.name ?? ""), Number(d.score ?? 0)]))
    : (rawDims as Record<string, number>);
  const dimensions = DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    score: clampScore(Number(dimMap[d.key] ?? overall)),
  }));
  const plan = (r["study_plan"] ?? r["studyPlan"] ?? []) as unknown[];
  const transcript = (r["transcript"] as any[] | undefined)?.map((l) => ({
    speaker: (l.speaker === "candidate" || l.role === "user" ? "candidate" : "agent") as TranscriptLine["speaker"],
    text: String(l.text ?? l.content ?? ""),
  }));
  return {
    overall,
    readiness: String(r["readiness_label"] ?? r["readiness"] ?? readinessLabel(overall)),
    dimensions,
    strengths: ((r["strengths"] ?? []) as unknown[]).map(String),
    gaps: ((r["gaps"] ?? r["weaknesses"] ?? []) as unknown[]).map(String),
    studyPlan: plan.map((p) =>
      typeof p === "string"
        ? { title: p, detail: "" }
        : {
            title: String((p as any).title ?? (p as any).step ?? ""),
            detail: String((p as any).detail ?? (p as any).description ?? ""),
            ...((p as any).minutes ? { minutes: Number((p as any).minutes) } : {}),
          },
    ),
    transcript: transcript && transcript.length ? transcript : fallbackTranscript,
  };
}

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic demo report: the same interview always gets the same numbers. */
export function buildMockReport(session: Session): Report {
  const rand = seeded(session.id);
  const role = getRole(session.roleId);
  const answers = session.transcript.filter((l) => l.speaker === "candidate").length;
  const base = 56 + Math.min(answers, 6) * 3 + rand() * 10;
  const dimensions = DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    score: clampScore(Math.max(30, Math.min(95, base + (rand() - 0.45) * 24))),
  }));
  const overall = clampScore(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const topics = role?.topics.map((t) => t.name) ?? ["core concepts", "system design"];
  const best = sorted[0]?.label.toLowerCase() ?? "reasoning";
  const second = sorted[1]?.label.toLowerCase() ?? "communication";
  const worst = sorted[sorted.length - 1]?.label.toLowerCase() ?? "depth";

  return {
    overall,
    readiness: readinessLabel(overall),
    dimensions,
    strengths: [
      `Strong ${best} — your answers were mostly correct and well reasoned.`,
      `Good ${second}; you explained ideas step by step.`,
      `Comfortable discussing ${topics[0] ?? "the core topics"}.`,
    ],
    gaps: [
      `Your ${worst} was the lowest area — add one concrete example per answer.`,
      `State trade-offs before jumping to a solution, especially on ${topics[1] ?? "design questions"}.`,
      `Review ${topics[topics.length - 1] ?? "fundamentals"}; some answers stayed at a high level.`,
    ],
    studyPlan: [
      { title: `Refresh ${topics[0] ?? "core concepts"}`, detail: "Read one solid reference and summarise it in your own words.", minutes: 45 },
      { title: "Answer with the STAR structure", detail: "Situation, Task, Action, Result — under two minutes per answer.", minutes: 30 },
      { title: `Go deeper on ${topics[1] ?? "system design"}`, detail: "Sketch a small design and list two alternatives with trade-offs.", minutes: 60 },
      { title: "Prepare two real project stories", detail: "One success, one failure. Include numbers: latency, cost, users.", minutes: 40 },
      { title: "Practise thinking out loud", detail: "Narrate every step while solving a problem, then summarise.", minutes: 25 },
      { title: "Retake this interview", detail: "Same role and level. Aim to beat today's score by 5 points.", minutes: session.duration },
    ],
    transcript: session.transcript,
  };
}
