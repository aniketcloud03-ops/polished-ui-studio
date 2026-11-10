import { getRole, type Duration, type Level } from "./roles";

export interface TranscriptLine {
  speaker: "ai" | "you";
  text: string;
}

export interface Session {
  id: string;
  roleId: string;
  level: Level;
  duration: Duration;
  createdAt: string;
  answered: number;
  totalQuestions: number;
  transcript: TranscriptLine[];
  sample?: boolean;
}

export interface Dimension {
  key: string;
  label: string;
  score: number;
  note: string;
}

export interface Evaluation {
  overall: number;
  readiness: [number, number];
  verdict: string;
  verdictTone: "strong" | "steady" | "early";
  dimensions: Dimension[];
  topics: { name: string; weight: number; score: number }[];
  strengths: string[];
  improvements: string[];
  plan: { title: string; detail: string; minutes: number }[];
}

const STORAGE_KEY = "ai-interviewer.sessions.v1";

export const SAMPLE_SESSIONS: Session[] = [
  {
    id: "sample-genai",
    roleId: "ai_engineer",
    level: "mid",
    duration: 30,
    createdAt: "2026-11-06T10:30:00.000Z",
    answered: 7,
    totalQuestions: 7,
    transcript: [],
    sample: true,
  },
  {
    id: "sample-backend",
    roleId: "backend_developer",
    level: "junior",
    duration: 15,
    createdAt: "2026-11-02T15:10:00.000Z",
    answered: 4,
    totalQuestions: 4,
    transcript: [],
    sample: true,
  },
];

function readStore(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

export function listSessions(): Session[] {
  return [...readStore(), ...SAMPLE_SESSIONS].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getSession(id: string): Session | undefined {
  return listSessions().find((s) => s.id === id);
}

export function saveSession(session: Session) {
  const all = readStore().filter((s) => s.id !== session.id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([session, ...all].slice(0, 30)));
}

export function newSessionId() {
  return `iv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Small deterministic PRNG so a report always looks the same for the same interview. */
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

const clamp = (n: number) => Math.max(20, Math.min(97, Math.round(n)));

export function evaluate(session: Session): Evaluation {
  const role = getRole(session.roleId);
  const rand = seeded(session.id);
  const completion = session.totalQuestions ? session.answered / session.totalQuestions : 0;
  const base = 52 + completion * 22 + rand() * 12;

  const dims: Omit<Dimension, "score">[] = [
    { key: "depth", label: "Technical depth", note: "How deeply you understand the concepts" },
    { key: "problem", label: "Problem solving", note: "How you break down and approach problems" },
    { key: "comm", label: "Communication", note: "Clarity and structure of your spoken answers" },
    { key: "systems", label: "System thinking", note: "Awareness of trade-offs and the bigger picture" },
    { key: "practice", label: "Real-world experience", note: "Concrete examples from your own work" },
  ];
  const dimensions = dims.map((d) => ({ ...d, score: clamp(base + (rand() - 0.45) * 26) }));
  const overall = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);

  const topics = (role?.topics ?? []).map((t) => ({
    ...t,
    score: clamp(overall + (rand() - 0.5) * 30),
  }));

  const verdictTone: Evaluation["verdictTone"] =
    overall >= 75 ? "strong" : overall >= 60 ? "steady" : "early";
  const verdict =
    verdictTone === "strong"
      ? "You're interview-ready. Polish a few edges and you'll stand out."
      : verdictTone === "steady"
        ? "Solid foundation. A focused week of practice will move you into the ready zone."
        : "Good start. Build the fundamentals below and try again in a few days.";

  const sortedDims = [...dimensions].sort((a, b) => b.score - a.score);
  const sortedTopics = [...topics].sort((a, b) => a.score - b.score);

  const strengths = [
    `Strong ${sortedDims[0].label.toLowerCase()} — your answers showed clear understanding.`,
    `Good ${sortedDims[1].label.toLowerCase()}; you explained your reasoning step by step.`,
    topics.length ? `Confident on ${[...topics].sort((a, b) => b.score - a.score)[0].name}.` : "",
  ].filter(Boolean);

  const improvements = [
    `Lift your ${sortedDims[4].label.toLowerCase()} by using one concrete example per answer.`,
    `Practise ${sortedDims[3].label.toLowerCase()}: state the trade-off before the solution.`,
    sortedTopics.length ? `Review ${sortedTopics[0].name} — it was your weakest area.` : "",
  ].filter(Boolean);

  const plan = [
    {
      title: `Refresh ${sortedTopics[0]?.name ?? "core concepts"}`,
      detail: "Read one solid reference and write a one-page summary in your own words.",
      minutes: 45,
    },
    {
      title: "Use the STAR structure out loud",
      detail: "Answer three past questions with Situation, Task, Action, Result — under 2 minutes each.",
      minutes: 30,
    },
    {
      title: `Go deeper on ${sortedTopics[1]?.name ?? "system design"}`,
      detail: "Sketch a small design and list two alternatives with their trade-offs.",
      minutes: 60,
    },
    {
      title: "Prepare two real project stories",
      detail: "One success and one failure. Include numbers: latency, cost, users, time saved.",
      minutes: 40,
    },
    {
      title: "Practise thinking aloud",
      detail: "Solve a problem while narrating each step. Pause, then summarise your answer.",
      minutes: 25,
    },
    {
      title: "Retake this interview",
      detail: "Same role and level. Aim to beat today's score by 5 points.",
      minutes: session.duration,
    },
  ];

  return {
    overall,
    readiness: [Math.max(0, overall - 5), Math.min(100, overall + 4)],
    verdict,
    verdictTone,
    dimensions,
    topics,
    strengths,
    improvements,
    plan,
  };
}
