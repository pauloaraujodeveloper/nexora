import type { ComponentType } from "react";
import { RiArrowDownLine, RiArrowUpLine } from "@remixicon/react";
import { cx } from "@/utils/cx";
import { useCountUp } from "@/lib/motion";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export type KpiTone = "cyan" | "violet" | "green" | "rose" | "amber";

const TONES: Record<KpiTone, { icon: string; spark: string }> = {
  cyan: { icon: "text-chart-1", spark: "text-chart-1" },
  violet: { icon: "text-chart-5", spark: "text-chart-5" },
  green: { icon: "text-chart-2", spark: "text-chart-2" },
  rose: { icon: "text-chart-9", spark: "text-chart-9" },
  amber: { icon: "text-chart-8", spark: "text-chart-8" },
};

export type KpiItem = {
  label: string;
  value: string;
  numeric?: number;
  format?: (value: number) => string;
  hint?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: IconComponent;
  tone?: KpiTone;
  spark?: number[];
  animate?: boolean;
};

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const width = 96;
  const height = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-5 w-16 overflow-visible" aria-hidden>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
      <path d={`${path} L${width},${height} L0,${height} Z`} fill="currentColor" opacity="0.08" />
    </svg>
  );
}

function KpiCell({ item }: { item: KpiItem }) {
  const counted = useCountUp(item.numeric ?? 0, item.animate !== false && item.numeric != null);
  const shown = item.numeric != null && item.format ? item.format(counted) : item.value;
  const palette = TONES[item.tone ?? "cyan"];
  const Icon = item.icon;

  return (
    <div className="flex min-w-0 flex-col gap-0.5 p-2.5 sm:px-4">
      <div className="flex items-center gap-1.5">
        <span className="truncate text-caption-2-semibold text-text-tertiary uppercase">{item.label}</span>
        {Icon ? <Icon className={cx("ms-auto size-3.5 shrink-0", palette.icon)} aria-hidden /> : null}
      </div>

      <span className="truncate font-display text-title-3-semibold text-text-primary tabular-nums">{shown}</span>

      <div className="flex min-w-0 items-center gap-2">
        {item.delta != null ? (
          <span
            className={cx(
              "inline-flex min-w-0 items-center gap-0.5 text-caption-2-semibold",
              item.delta >= 0 ? "text-state-success-text" : "text-text-error-primary",
            )}
          >
            {item.delta >= 0 ? (
              <RiArrowUpLine className="size-3 shrink-0" aria-hidden />
            ) : (
              <RiArrowDownLine className="size-3 shrink-0" aria-hidden />
            )}
            {Math.abs(item.delta).toFixed(1).replace(".", ",")}%
            <span className="truncate font-normal text-text-tertiary">
              {item.deltaLabel ?? "vs. período anterior"}
            </span>
          </span>
        ) : (
          <span className="truncate text-caption-2-regular text-text-tertiary">{item.hint ?? "\u00A0"}</span>
        )}
        {item.spark ? (
          <span className={cx("ms-auto shrink-0", palette.spark)}>
            <Sparkline points={item.spark} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** One compact panel that replaces the former large KPI card grid. */
export function KpiStrip({ items, className }: { items: KpiItem[]; className?: string }) {
  return (
    <section
      data-reveal
      className={cx(
        "glass-card grid grid-cols-2 divide-y divide-separator-border rounded-3xl lg:grid-cols-4 lg:divide-x lg:divide-y-0",
        className,
      )}
    >
      {items.map((item) => (
        <KpiCell key={item.label} item={item} />
      ))}
    </section>
  );
}
