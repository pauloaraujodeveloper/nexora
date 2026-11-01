import { useId, useState, type ReactNode } from "react";
import { RiFilter3Line } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

type FilterBarProps = {
  /** Always-visible control: search, period, or another primary filter. */
  primary: ReactNode;
  /** Secondary controls revealed by the "Filtros" button. */
  children: ReactNode;
  /** Number of active filters, shown next to the button label. */
  activeCount?: number;
  onClear?: () => void;
  /** Open on first render when filters arrive from the URL. */
  defaultOpen?: boolean;
  className?: string;
};

/**
 * Compact filter toolbar: the primary control stays visible while the
 * secondary selects live in a collapsible region. The trigger owns
 * `aria-expanded`/`aria-controls` and the collapsed panel is inert, so
 * keyboard and screen-reader users only reach controls that are visible.
 */
export function FilterBar({
  primary,
  children,
  activeCount = 0,
  onClear,
  defaultOpen = false,
  className,
}: FilterBarProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section
      data-reveal
      className={cx(
        "rounded-2xl border border-separator-border bg-background-secondary-default p-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{primary}</div>
        <div className="ms-auto flex items-center gap-1.5">
          {activeCount > 0 && onClear ? (
            <Button variant="ghost" size="small" onClick={onClear}>
              Limpar
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiFilter3Line}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((current) => !current)}
            className={open ? "border-accent-400/40 text-accent-100" : undefined}
          >
            Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
        </div>
      </div>

      <div
        id={panelId}
        aria-hidden={!open}
        className={cx(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div inert={!open} className="grid gap-2 pt-2">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
