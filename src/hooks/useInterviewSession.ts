import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionInfo } from "@/lib/api";
import { FORCE_MOCK } from "@/lib/api";

/**
 * Thin adapter over the live voice session. ALL LiveKit code lives in this file so
 * UI components only see plain state, captions and an audio track.
 */
export type SessionState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "reconnecting"
  | "ended"
  | "error";

export interface Caption {
  id: string;
  speaker: "agent" | "candidate";
  text: string;
  final: boolean;
}

export interface InterviewSessionOptions {
  /** Lines the mock interviewer asks (mock mode only). */
  mockQuestions?: string[];
  /** Speak mock lines out loud with the browser voice. */
  mockVoice?: boolean;
}

export interface InterviewSession {
  state: SessionState;
  agentAudioTrack: MediaStreamTrack | null;
  captions: Caption[];
  elapsedSec: number;
  muted: boolean;
  error: string | null;
  isMock: boolean;
  connect: (connInfo: ConnectionInfo) => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
}

type Cleanup = () => void;

function upsert(list: Caption[], c: Caption): Caption[] {
  const i = list.findIndex((x) => x.id === c.id);
  if (i === -1) return [...list, c];
  const next = list.slice();
  next[i] = c;
  return next;
}

export function useInterviewSession(options: InterviewSessionOptions = {}): InterviewSession {
  const [state, setState] = useState<SessionState>("idle");
  const [agentAudioTrack, setAgentAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  const cleanupRef = useRef<Cleanup | null>(null);
  const muteRef = useRef<(muted: boolean) => void>(() => {});
  const optsRef = useRef(options);
  optsRef.current = options;

  const live = state !== "idle" && state !== "ended" && state !== "error" && state !== "connecting";
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [live]);

  const disconnect = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setAgentAudioTrack(null);
    setState("ended");
  }, []);

  useEffect(() => () => cleanupRef.current?.(), []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      muteRef.current(!m);
      return !m;
    });
  }, []);

  const connect = useCallback(async (conn: ConnectionInfo) => {
    cleanupRef.current?.();
    setError(null);
    setCaptions([]);
    setElapsedSec(0);
    setState("connecting");
    const mock = FORCE_MOCK || !!conn.mock;
    setIsMock(mock);
    try {
      cleanupRef.current = mock
        ? startMock(optsRef.current, { setState, setCaptions, setAgentAudioTrack, muteRef })
        : await startLiveKit(conn, { setState, setCaptions, setAgentAudioTrack, setError, muteRef });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to the interview room.");
      setState("error");
    }
  }, []);

  return { state, agentAudioTrack, captions, elapsedSec, muted, error, isMock, connect, disconnect, toggleMute };
}

/* ------------------------------------------------------------------ */
/* LiveKit implementation                                              */
/* ------------------------------------------------------------------ */

interface LiveDeps {
  setState: (s: SessionState) => void;
  setCaptions: React.Dispatch<React.SetStateAction<Caption[]>>;
  setAgentAudioTrack: (t: MediaStreamTrack | null) => void;
  setError: (e: string | null) => void;
  muteRef: React.MutableRefObject<(muted: boolean) => void>;
}

async function startLiveKit(conn: ConnectionInfo, d: LiveDeps): Promise<Cleanup> {
  const { Room, RoomEvent, Track } = await import("livekit-client");
  const room = new Room({ adaptiveStream: true, dynacast: true });
  const audioEls: HTMLMediaElement[] = [];
  let userLeft = false;

  const derive = (speakers: { identity: string }[]) => {
    const local = room.localParticipant.identity;
    if (speakers.some((p) => p.identity !== local)) d.setState("speaking");
    else if (speakers.some((p) => p.identity === local)) d.setState("listening");
    else d.setState("thinking");
  };

  room
    .on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio) return;
      const el = track.attach();
      el.style.display = "none";
      document.body.appendChild(el);
      audioEls.push(el);
      d.setAgentAudioTrack(track.mediaStreamTrack);
    })
    .on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
      if (track.kind === Track.Kind.Audio) d.setAgentAudioTrack(null);
    })
    .on(RoomEvent.ActiveSpeakersChanged, (speakers) => derive(speakers))
    .on(RoomEvent.Reconnecting, () => d.setState("reconnecting"))
    .on(RoomEvent.Reconnected, () => derive(room.activeSpeakers))
    .on(RoomEvent.Disconnected, () => {
      d.setAgentAudioTrack(null);
      if (userLeft) d.setState("ended");
      else {
        d.setError("The connection to the interview room was lost.");
        d.setState("error");
      }
    })
    .on(RoomEvent.TranscriptionReceived, (segments, participant) => {
      const speaker = participant?.identity === room.localParticipant.identity ? "candidate" : "agent";
      d.setCaptions((list) =>
        segments.reduce((acc, s) => upsert(acc, { id: s.id, speaker, text: s.text, final: s.final }), list),
      );
    });

  // Newer agents publish captions as text streams.
  try {
    room.registerTextStreamHandler("lk.transcription", async (reader, participant) => {
      const speaker = participant.identity === room.localParticipant.identity ? "candidate" : "agent";
      const id = reader.info.attributes?.["lk.segment_id"] ?? reader.info.id;
      let text = "";
      for await (const chunk of reader) {
        text += chunk;
        d.setCaptions((list) => upsert(list, { id, speaker, text, final: false }));
      }
      d.setCaptions((list) => upsert(list, { id, speaker, text, final: true }));
    });
  } catch {
    /* older server — TranscriptionReceived covers it */
  }

  await room.connect(conn.url, conn.token);
  await room.startAudio().catch(() => {});
  await room.localParticipant.setMicrophoneEnabled(true);
  d.muteRef.current = (m) => void room.localParticipant.setMicrophoneEnabled(!m);
  d.setState("thinking");

  return () => {
    userLeft = true;
    audioEls.forEach((el) => el.remove());
    void room.disconnect();
  };
}

/* ------------------------------------------------------------------ */
/* Mock implementation (VITE_MOCK=true or no backend)                  */
/* ------------------------------------------------------------------ */

interface MockDeps {
  setState: (s: SessionState) => void;
  setCaptions: React.Dispatch<React.SetStateAction<Caption[]>>;
  setAgentAudioTrack: (t: MediaStreamTrack | null) => void;
  muteRef: React.MutableRefObject<(muted: boolean) => void>;
}

const MOCK_ANSWERS = [
  "I'd start by clarifying the requirements, then sketch a simple version and measure it before optimising.",
  "In my last project we hit exactly this. We added caching in front of the slow call and cut latency by about forty percent.",
  "The main trade-off is consistency versus speed. I'd pick based on what the user actually notices.",
  "I'd add monitoring first so we can see the problem, then roll out the fix behind a feature flag.",
];

function startMock(opts: InterviewSessionOptions, d: MockDeps): Cleanup {
  const questions = opts.mockQuestions?.length
    ? opts.mockQuestions
    : ["Tell me about a project you're proud of.", "How would you design a URL shortener?"];
  const timers: number[] = [];
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
  let micMuted = false;
  let stopped = false;
  d.muteRef.current = (m) => {
    micMuted = m;
  };

  // A silent-to-the-speakers "babble" track so the character's lipsync has something to follow.
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 140;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const dest = ctx.createMediaStreamDestination();
  osc.connect(gain).connect(dest);
  osc.start();
  const resume = () => void ctx.resume();
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
  resume();
  d.setAgentAudioTrack(dest.stream.getAudioTracks()[0] ?? null);

  let babble = 0;
  const startBabble = () => {
    const tick = () => {
      const t = ctx.currentTime;
      gain.gain.setTargetAtTime(Math.random() < 0.18 ? 0.02 : 0.25 + Math.random() * 0.6, t, 0.03);
      osc.frequency.setTargetAtTime(110 + Math.random() * 90, t, 0.05);
      babble = window.setTimeout(tick, 90 + Math.random() * 90);
    };
    tick();
  };
  const stopBabble = () => {
    window.clearTimeout(babble);
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  };

  const say = (text: string, id: string, onDone: () => void) => {
    d.setState("speaking");
    startBabble();
    if (opts.mockVoice && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.03;
      window.speechSynthesis.speak(u);
    }
    const words = text.split(" ");
    words.forEach((_, i) =>
      later(() => {
        const final = i === words.length - 1;
        d.setCaptions((l) => upsert(l, { id, speaker: "agent", text: words.slice(0, i + 1).join(" "), final }));
        if (final) {
          stopBabble();
          later(onDone, 500);
        }
      }, 120 + i * 230),
    );
  };

  const answer = (n: number, onDone: () => void) => {
    d.setState("listening");
    const text = MOCK_ANSWERS[n % MOCK_ANSWERS.length] ?? "";
    const words = text.split(" ");
    const id = `c-${n}`;
    words.forEach((_, i) =>
      later(() => {
        if (micMuted) return;
        const final = i === words.length - 1;
        d.setCaptions((l) => upsert(l, { id, speaker: "candidate", text: words.slice(0, i + 1).join(" "), final }));
        if (final) later(onDone, 900);
      }, 800 + i * 260),
    );
    if (micMuted) later(onDone, 6000);
  };

  const run = (i: number) => {
    if (stopped) return;
    const q = questions[i];
    if (q === undefined) {
      say("That's all my questions. Thanks for your time — press End interview to see your report.", "a-end", () =>
        d.setState("listening"),
      );
      return;
    }
    const intro = i === 0 ? "Hi, thanks for joining. Let's begin. " : "Thanks. ";
    say(intro + q, `a-${i}`, () =>
      answer(i, () => {
        d.setState("thinking");
        later(() => run(i + 1), 1600);
      }),
    );
  };

  later(() => {
    d.setState("thinking");
    later(() => run(0), 1200);
  }, 1200);

  return () => {
    stopped = true;
    timers.forEach((t) => window.clearTimeout(t));
    stopBabble();
    window.speechSynthesis?.cancel();
    window.removeEventListener("pointerdown", resume);
    window.removeEventListener("keydown", resume);
    osc.stop();
    void ctx.close();
  };
}
