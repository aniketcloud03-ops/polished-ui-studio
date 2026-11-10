import { motion } from "motion/react";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export const FLOW_STEPS = ["Choose role", "Set up", "Mic check", "Interview", "Your report"];

export function FlowStepper({ current, tone = "light" }: { current: number; tone?: "light" | "stage" }) {
  const stage = tone === "stage";
  return (
    <ol className="flex w-full items-center gap-2 sm:gap-3" aria-label="Interview progress">
      {FLOW_STEPS.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <motion.span
                initial={false}
                animate={{ scale: now ? 1 : 0.92 }}
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors duration-500",
                  done && "bg-success text-success-foreground",
                  now && "bg-primary text-primary-foreground shadow-ember",
                  !done && !now && (stage ? "bg-stage-raised text-stage-muted" : "bg-secondary text-muted-foreground"),
                )}
                aria-current={now ? "step" : undefined}
              >
                {done ? <CheckCircle weight="fill" className="h-4 w-4" /> : i + 1}
              </motion.span>
              <span
                className={cn(
                  "hidden truncate text-xs font-semibold md:inline",
                  now ? (stage ? "text-stage-foreground" : "text-foreground") : stage ? "text-stage-muted" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <span className={cn("relative h-[3px] flex-1 overflow-hidden rounded-full", stage ? "bg-stage-raised" : "bg-secondary")}>
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full bg-sunrise"
                  initial={{ width: 0 }}
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.9, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
