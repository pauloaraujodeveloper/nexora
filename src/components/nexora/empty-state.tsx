import type { ComponentType, ReactNode } from "react";
import { RiFlashlightLine } from "@remixicon/react";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export function EmptyState({
  icon: Icon = RiFlashlightLine,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: IconComponent;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center gap-2 py-8 text-center"
          : "flex flex-col items-center justify-center gap-3 py-14 text-center"
      }
    >
      <span className="nx-empty-orbit text-brand-cyan">
        <Icon className="size-6" aria-hidden />
      </span>
      <div>
        <p className="text-[13.5px] font-semibold text-text-primary">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-text-tertiary">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
