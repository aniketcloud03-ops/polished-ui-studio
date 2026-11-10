import { Link } from "@tanstack/react-router";
import { Waveform } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-sunrise shadow-ember",
        className,
      )}
    >
      <Waveform weight="fill" className="h-5 w-5 text-foreground" />
    </span>
  );
}

export function Brand({ tone = "light" }: { tone?: "light" | "stage" }) {
  return (
    <Link to="/" className="group flex min-w-0 items-center gap-3">
      <BrandMark className="transition-transform duration-500 group-hover:rotate-[-8deg]" />
      <span className="min-w-0 leading-tight">
        <span
          className={cn(
            "block truncate text-[15px] font-extrabold tracking-tight",
            tone === "stage" ? "text-stage-foreground" : "text-foreground",
          )}
        >
          AI Interviewer
        </span>
        <span
          className={cn(
            "block truncate text-xs font-medium",
            tone === "stage" ? "text-stage-muted" : "text-muted-foreground",
          )}
        >
          Voice mock interviews
        </span>
      </span>
    </Link>
  );
}
