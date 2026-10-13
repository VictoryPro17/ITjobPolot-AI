import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
}

const circumference = 2 * Math.PI * 42;

export function ScoreRing({ score, size = 112 }: ScoreRingProps) {
  const colorClass = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-sky-500" : "text-amber-500";

  return (
    <div role="img" aria-label={`Match-Score ${score} Prozent`} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx={50} cy={50} r={42} strokeWidth={8} fill="none" className="stroke-muted" />
        <circle
          cx={50}
          cy={50}
          r={42}
          strokeWidth={8}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700", colorClass)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tabular-nums">{score}%</div>
    </div>
  );
}
