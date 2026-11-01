import { useEffect, useId, useRef } from "react";
import { animate } from "animejs";
import { cx } from "@/utils/cx";
import type { HealthBand } from "@/lib/types";

const BAND_COLORS: Record<HealthBand, { from: string; to: string; text: string }> = {
  saudavel: { from: "#34d399", to: "#22d3ee", text: "#5eead4" },
  atencao: { from: "#fbbf24", to: "#fb923c", text: "#fcd34d" },
  risco: { from: "#fb7185", to: "#e040fb", text: "#fda4af" },
};

type HealthRingProps = {
  score: number;
  band: HealthBand;
  size?: number;
  stroke?: number;
  showScore?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
};

export function HealthRing({
  score,
  band,
  size = 60,
  stroke = 5,
  showScore = true,
  label,
  animated = true,
  className,
}: HealthRingProps) {
  const gradientId = useId().replace(/:/g, "");
  const circleRef = useRef<SVGCircleElement>(null);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference - (clamped / 100) * circumference;
  const colors = BAND_COLORS[band];

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    if (!animated) {
      circle.style.strokeDashoffset = `${offset}`;
      return;
    }
    const state = { value: circumference };
    circle.style.strokeDashoffset = `${circumference}`;
    const animation = animate(state, {
      value: offset,
      duration: 1100,
      ease: "out(3)",
      onUpdate: () => {
        circle.style.strokeDashoffset = `${state.value}`;
      },
    });
    return () => {
      animation.revert();
    };
  }, [offset, circumference, animated]);

  return (
    <div
      className={cx("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Health score ${score} de 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(126,148,196,0.16)"
          strokeWidth={stroke}
        />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          className="nx-ring-glow"
        />
      </svg>
      {showScore && (
        <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span
            className="font-display font-bold tabular-nums"
            style={{ fontSize: size * 0.3, color: colors.text }}
          >
            {Math.round(score)}
          </span>
          {label && (
            <span className="mt-0.5 text-[8px] font-semibold tracking-[0.1em] text-text-tertiary uppercase">
              {label}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export function bandColors(band: HealthBand) {
  return BAND_COLORS[band];
}
