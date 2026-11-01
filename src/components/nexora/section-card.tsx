import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

type SectionCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
  reveal?: boolean;
  as?: "section" | "div" | "article";
};

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  padded = true,
  reveal = true,
  as: Tag = "section",
}: SectionCardProps) {
  return (
    <Tag
      {...(reveal ? { "data-reveal": true } : {})}
      className={cx("glass-card flex min-w-0 flex-col", className)}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-white/5 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-display text-[14px] font-semibold tracking-tight text-text-primary">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-[11.5px] leading-snug text-text-tertiary">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-1.5">{action}</div> : null}
        </div>
      )}
      <div className={cx("min-w-0 flex-1", padded && "p-4 sm:p-5", bodyClassName)}>{children}</div>
    </Tag>
  );
}
