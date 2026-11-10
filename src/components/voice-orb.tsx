import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type OrbPhase = "connecting" | "speaking" | "listening" | "thinking" | "done";

/** The interviewer's "face": a living sunrise orb that reacts to who is talking. */
export function VoiceOrb({ phase, level = 0 }: { phase: OrbPhase; level?: number }) {
  const speaking = phase === "speaking";
  const listening = phase === "listening";
  const thinking = phase === "thinking" || phase === "connecting";
  const userScale = listening ? 1 + Math.min(level, 1) * 0.35 : 1;

  return (
    <div className="relative grid h-[260px] w-[260px] place-items-center sm:h-[300px] sm:w-[300px]">
      {/* Halo */}
      <motion.div
        className="absolute inset-0 rounded-full bg-sunrise blur-3xl"
        animate={{ opacity: speaking ? 0.55 : listening ? 0.25 + level * 0.5 : 0.18, scale: speaking ? 1.05 : 0.9 }}
        transition={{ duration: 0.8 }}
      />

      {/* Ripple rings while the interviewer talks */}
      {speaking &&
        [0, 0.7, 1.4].map((d) => (
          <span
            key={d}
            className="absolute inset-[18%] animate-pulse-ring rounded-full border-2 border-sun-2/70"
            style={{ animationDelay: `${d}s` }}
          />
        ))}

      {/* Listening ring follows the user's voice */}
      <motion.span
        className={cn(
          "absolute inset-[12%] rounded-full border-[3px]",
          listening ? "border-success" : "border-transparent",
        )}
        animate={{ scale: userScale, opacity: listening ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />

      {/* Thinking: orbiting arc */}
      {thinking && (
        <motion.svg
          viewBox="0 0 100 100"
          className="absolute inset-[10%]"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        >
          <circle cx="50" cy="50" r="47" fill="none" className="stroke-sun-2" strokeWidth="2" strokeDasharray="60 240" strokeLinecap="round" />
        </motion.svg>
      )}

      {/* Core */}
      <motion.div
        className="relative h-[58%] w-[58%] overflow-hidden rounded-full shadow-ember"
        animate={{
          scale: speaking ? [1, 1.06, 0.98, 1.05, 1] : thinking ? [1, 0.96, 1] : listening ? 0.94 : 0.9,
        }}
        transition={{ duration: speaking ? 1.3 : 2.4, repeat: speaking || thinking ? Infinity : 0, ease: "easeInOut" }}
      >
        <motion.div
          className="absolute -inset-1/4"
          style={{
            background:
              "conic-gradient(from 0deg, var(--sun-1), var(--sun-2), var(--sun-3), var(--sun-2), var(--sun-1))",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: speaking ? 5 : 14, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-[14%] rounded-full bg-sun-3/30 blur-xl" />
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex h-12 items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.span
                key={i}
                className="w-1.5 rounded-full bg-stage/80"
                animate={{
                  height: speaking ? [10, 34 - Math.abs(2 - i) * 7, 14, 28, 10] : listening ? 6 + level * 30 * (1 - Math.abs(2 - i) * 0.2) : 6,
                }}
                transition={
                  speaking
                    ? { duration: 0.9, repeat: Infinity, delay: i * 0.09, ease: "easeInOut" }
                    : { type: "spring", stiffness: 400, damping: 25 }
                }
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
