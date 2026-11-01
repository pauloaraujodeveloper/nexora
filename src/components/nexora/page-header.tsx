import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

type PageHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      data-reveal
      className={cx("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-text-tertiary uppercase">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-cyan shadow-[0_0_10px_#22d3ee]" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[26px] leading-tight font-bold text-text-primary sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
