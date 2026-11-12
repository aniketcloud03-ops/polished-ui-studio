import { buildMockReport, normalizeReport, type ReportResult } from "./report";
import { getSession, newLocalId, saveSession, type Session } from "./sessions";
import type { Duration, Level } from "./roles";

/** Backend base URL. Configure with VITE_API_URL; never put secrets here. */
export const API_URL: string = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8000";
export const FORCE_MOCK = import.meta.env["VITE_MOCK"] === "true";

/** Time a mock report takes to "generate", so the loading state is visible. */
export const MOCK_REPORT_DELAY_MS = 7000;

export interface ConnectionInfo {
  url: string;
  token: string;
  mock?: boolean;
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 5000): Promise<{ status: number; data: T }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok && res.status !== 202) throw new Error(`API ${res.status}`);
    const text = await res.text();
    return { status: res.status, data: (text ? JSON.parse(text) : {}) as T };
  } finally {
    clearTimeout(timer);
  }
}

export async function createInterview(input: {
  roleId: string;
  level: Level;
  duration: Duration;
  characterId: string;
}): Promise<Session> {
  let id: string | null = null;
  let mock = true;
  if (!FORCE_MOCK) {
    try {
      const { data } = await request<{ id?: string; interview_id?: string }>("/interviews", {
        method: "POST",
        body: JSON.stringify({
          role_id: input.roleId,
          seniority: input.level,
          duration_minutes: input.duration,
          character_id: input.characterId,
        }),
      });
      id = data.id ?? data.interview_id ?? null;
      mock = !id;
    } catch {
      /* backend unavailable — fall back to demo mode */
    }
  }
  const session: Session = {
    id: id ?? newLocalId(),
    ...input,
    createdAt: new Date().toISOString(),
    transcript: [],
    mock,
  };
  saveSession(session);
  return session;
}

export async function startInterview(id: string): Promise<ConnectionInfo> {
  const session = getSession(id);
  if (FORCE_MOCK || session?.mock) return { url: "mock://", token: "mock", mock: true };
  try {
    const { data } = await request<{ url?: string; livekit_url?: string; token?: string; participant_token?: string }>(
      `/interviews/${encodeURIComponent(id)}/start`,
      { method: "POST" },
    );
    const url = data.url ?? data.livekit_url;
    const token = data.token ?? data.participant_token;
    if (url && token) return { url, token };
  } catch {
    /* fall through to mock */
  }
  return { url: "mock://", token: "mock", mock: true };
}

/** True when a report should still show as "generating" in demo mode. */
export function mockReportPending(endedAt: string | undefined, now: number): boolean {
  if (!endedAt) return false;
  return now - new Date(endedAt).getTime() < MOCK_REPORT_DELAY_MS;
}

export async function fetchReport(id: string, now = Date.now()): Promise<ReportResult> {
  const session = getSession(id);
  if (!FORCE_MOCK && !session?.mock) {
    try {
      const { status, data } = await request<Record<string, unknown>>(`/interviews/${encodeURIComponent(id)}/report`);
      const s = String(data["status"] ?? "");
      if (status === 202 || s === "pending" || s === "generating" || s === "processing") return { status: "pending" };
      const body = (data["report"] as Record<string, unknown> | undefined) ?? data;
      return { status: "ready", report: normalizeReport(body, session?.transcript ?? []), mock: false };
    } catch {
      /* API unavailable — use demo data */
    }
  }
  if (!session) throw new Error("not-found");
  if (mockReportPending(session.endedAt, now)) return { status: "pending" };
  return { status: "ready", report: buildMockReport(session), mock: true };
}
