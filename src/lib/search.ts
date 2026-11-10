import { ROLES, type Duration, type Level } from "./roles";

export interface InterviewSearch {
  role: string;
  level: Level;
  duration: Duration;
  typing?: boolean;
}

export function validateInterviewSearch(search: Record<string, unknown>): InterviewSearch {
  const role = typeof search.role === "string" && ROLES.some((r) => r.id === search.role) ? search.role : ROLES[0].id;
  const level = (["junior", "mid", "senior"] as const).includes(search.level as Level) ? (search.level as Level) : "mid";
  const d = Number(search.duration);
  const duration = (d === 15 || d === 30 || d === 45 ? d : 30) as Duration;
  const typing = search.typing === true || search.typing === "true" ? true : undefined;
  return { role, level, duration, typing };
}
