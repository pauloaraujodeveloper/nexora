import type { ComponentType, ReactNode } from "react";
import { cx } from "@/utils/cx";
import { Avatar } from "@/components/base/avatar/avatar";
import { initials } from "@/lib/format";
import type { Customer, User } from "@/lib/types";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export function CustomerAvatar({
  customer,
  size = 36,
  className,
}: {
  customer: Pick<Customer, "tradeName" | "logoColor">;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-xl font-display font-bold text-white ring-1 ring-white/10",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(135deg, ${customer.logoColor}, ${customer.logoColor}66 55%, rgba(34,211,238,0.55))`,
      }}
      aria-hidden
    >
      {initials(customer.tradeName)}
    </span>
  );
}

export function OwnerChip({ user, compact = false }: { user?: User; compact?: boolean }) {
  if (!user) return <span className="text-[12px] text-text-tertiary">Sem responsável</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar size="sm" initials={initials(user.name)} color="blue" />
      {!compact && <span className="truncate text-[12.5px] text-text-secondary">{user.name}</span>}
    </span>
  );
}

export function UserAvatar({ user, size = "md" }: { user: User; size?: "xs" | "sm" | "md" | "lg" }) {
  return (
    <span
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-1 ring-white/10",
        size === "xs" && "size-5 text-[9px]",
        size === "sm" && "size-6 text-[10px]",
        size === "md" && "size-8 text-[12px]",
        size === "lg" && "size-9 text-[13px]",
      )}
      style={{ background: `linear-gradient(140deg, ${user.color}, ${user.color}88)` }}
      title={user.name}
    >
      {initials(user.name)}
    </span>
  );
}

export function IconTile({
  icon: Icon,
  tone = "cyan",
  className,
}: {
  icon: IconComponent;
  tone?: "cyan" | "violet" | "green" | "rose" | "amber" | "neutral";
  className?: string;
}) {
  const tones = {
    cyan: "bg-cyan-400/10 text-cyan-300 ring-cyan-400/20",
    violet: "bg-violet-400/10 text-violet-300 ring-violet-400/20",
    green: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
    rose: "bg-rose-400/10 text-rose-300 ring-rose-400/20",
    amber: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
    neutral: "bg-white/5 text-text-secondary ring-white/10",
  };
  return (
    <span className={cx("grid size-9 shrink-0 place-items-center rounded-xl ring-1", tones[tone], className)}>
      <Icon className="size-[18px]" aria-hidden />
    </span>
  );
}

export function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-semibold tracking-[0.08em] text-text-tertiary uppercase">{label}</dt>
      <dd className="mt-1 truncate text-[13px] font-medium text-text-primary">{children}</dd>
    </div>
  );
}

export function InlineProgress({
  value,
  tone = "brand",
  className,
}: {
  value: number;
  tone?: "brand" | "green" | "amber" | "rose";
  className?: string;
}) {
  const gradients = {
    brand: "from-brand-cyan via-brand-violet to-brand-magenta",
    green: "from-emerald-400 to-teal-400",
    amber: "from-amber-400 to-orange-400",
    rose: "from-rose-400 to-fuchsia-400",
  };
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]", className)}>
      <div
        className={cx("h-full rounded-full bg-gradient-to-r transition-[width] duration-700", gradients[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10.5px] font-medium text-text-secondary",
        className,
      )}
    >
      {children}
    </span>
  );
}
