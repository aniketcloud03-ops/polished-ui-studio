import type { Duration, Level } from "./roles";

export interface TranscriptLine {
  speaker: "agent" | "candidate";
  text: string;
}

/** Interview metadata kept in this browser so every screen knows the role, level and character. */
export interface Session {
  id: string;
  roleId: string;
  level: Level;
  duration: Duration;
  characterId: string;
  createdAt: string;
  endedAt?: string;
  transcript: TranscriptLine[];
  mock: boolean;
  sample?: boolean;
}

const STORAGE_KEY = "ai-interviewer.sessions.v2";

export const SAMPLE_SESSIONS: Session[] = [
  {
    id: "sample-genai",
    roleId: "ai_engineer",
    level: "mid",
    duration: 30,
    characterId: "mira",
    createdAt: "2026-11-06T10:30:00.000Z",
    endedAt: "2026-11-06T11:00:00.000Z",
    transcript: [
      { speaker: "agent", text: "How would you chunk long PDF manuals for a retrieval pipeline?" },
      { speaker: "candidate", text: "I'd split on headings first, then cap chunks at around 500 tokens with a small overlap so answers aren't cut in half." },
      { speaker: "agent", text: "How would you check that a change actually improved retrieval?" },
      { speaker: "candidate", text: "I'd keep a labelled set of questions and track recall at k and answer faithfulness before and after the change." },
    ],
    mock: true,
    sample: true,
  },
  {
    id: "sample-backend",
    roleId: "backend_developer",
    level: "junior",
    duration: 15,
    characterId: "kai",
    createdAt: "2026-11-02T15:10:00.000Z",
    endedAt: "2026-11-02T15:25:00.000Z",
    transcript: [],
    mock: true,
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
  return [...readStore(), ...SAMPLE_SESSIONS].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSession(id: string): Session | undefined {
  return listSessions().find((s) => s.id === id);
}

export function saveSession(session: Session) {
  if (typeof window === "undefined") return;
  const all = readStore().filter((s) => s.id !== session.id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([session, ...all].slice(0, 30)));
}

export function updateSession(id: string, patch: Partial<Session>) {
  const current = getSession(id);
  if (current && !current.sample) saveSession({ ...current, ...patch });
}

export function newLocalId() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
