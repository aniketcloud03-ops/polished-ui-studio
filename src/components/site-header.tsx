import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { House, ClockCounterClockwise, Play } from "@phosphor-icons/react/dist/ssr";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Practice", icon: House },
  { to: "/interviews", label: "My interviews", icon: ClockCounterClockwise },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = (to: string) =>
    to === "/" ? pathname === "/" || pathname.startsWith("/roles") || pathname === "/check" : pathname.startsWith(to);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto grid h-[72px] max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-8">
        <Brand />
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => {
            const isActive = active(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-secondary"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon weight="fill" className="relative h-[18px] w-[18px]" />
                <span className="relative hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <Button asChild size="sm" className="ml-1 hidden md:inline-flex">
            <Link to="/" hash="roles">
              <Play weight="fill" />
              Start practicing
            </Link>
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>AI Interviewer — practise technical interviews out loud.</p>
        <p>15 engineering roles · Voice powered by LiveKit, Gemini & OpenAI Audio</p>
      </div>
    </footer>
  );
}
