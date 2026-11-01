import { cx } from "@/utils/cx";

type NexoraMarkProps = {
  size?: number;
  className?: string;
  glow?: boolean;
  alt?: string;
};

/**
 * The Nexora mark. The source artwork is a square neon knot on a dark field,
 * so it is always presented inside a rounded tile rather than knocked out.
 */
export function NexoraMark({ size = 36, className, glow = true, alt = "Nexora" }: NexoraMarkProps) {
  return (
    <span
      className={cx(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[30%]",
        "ring-1 ring-white/10",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img src="/nexora-mark.png" alt={alt} className="size-full object-cover" draggable={false} />
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(34,211,238,0.28),transparent_58%),radial-gradient(circle_at_78%_82%,rgba(224,64,251,0.24),transparent_60%)]"
        />
      )}
    </span>
  );
}

export function NexoraWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <NexoraMark size={compact ? 32 : 36} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[17px] font-extrabold tracking-[0.16em] text-text-primary">
          NEXORA
        </span>
        {!compact && (
          <span className="mt-1 text-[10px] font-medium tracking-[0.18em] text-text-tertiary uppercase">
            Customer Intelligence
          </span>
        )}
      </span>
    </span>
  );
}
