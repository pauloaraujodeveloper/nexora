import { useState } from "react";
import {
  RiAlertLine,
  RiArrowRightLine,
  RiCalendarLine,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiTimeLine,
} from "@remixicon/react";
import { Drawer } from "@/components/base/drawer/drawer";
import { Button } from "@/components/base/buttons/button";
import { SeverityPill } from "@/components/nexora/status-pill";
import { formatCurrency } from "@/lib/format";
import type { OrgAlert } from "@/lib/alerts";
import { cx } from "@/utils/cx";

type NotificationsDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  alerts: OrgAlert[];
  onOpenCustomer: (id: string) => void;
  onSeeTasks: () => void;
};

type Filter = "todas" | "criticas" | "renovacoes";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "criticas", label: "Críticas" },
  { id: "renovacoes", label: "Renovações" },
];

export function NotificationsDrawer({
  isOpen,
  onOpenChange,
  alerts,
  onOpenCustomer,
  onSeeTasks,
}: NotificationsDrawerProps) {
  const [filter, setFilter] = useState<Filter>("todas");

  const filtered = alerts.filter((alert) => {
    if (filter === "criticas") return alert.severity === "critica" || alert.severity === "alta";
    if (filter === "renovacoes") return alert.type === "renovacao";
    return true;
  });

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="end"
      size="md"
      aria-label="Central de alertas"
      className="bg-[#0b1120]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-4">
          <div>
            <h2 className="font-display text-[16px] font-semibold text-text-primary">Central de alertas</h2>
            <p className="mt-0.5 text-[11.5px] text-text-tertiary">
              {alerts.length} sinais ativos na carteira
            </p>
          </div>
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={RiCloseLine}
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
          />
        </div>

        <div className="flex gap-1 border-b border-white/[0.07] px-3 py-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cx(
                "rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium transition-colors",
                filter === item.id
                  ? "bg-accent-500/15 text-accent-200 ring-1 ring-accent-400/30"
                  : "text-text-tertiary hover:bg-white/[0.05] hover:text-text-secondary",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="nx-scroll flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
                <RiCheckboxCircleLine className="size-5" aria-hidden />
              </span>
              <p className="text-[12.5px] font-medium text-text-primary">Nenhum alerta neste filtro</p>
              <p className="max-w-[220px] text-[11px] text-text-tertiary">
                A carteira está sob controle. Continue registrando as interações.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((alert) => {
                const critical = alert.severity === "critica" || alert.severity === "alta";
                return (
                  <li key={alert.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCustomer(alert.customerId);
                        onOpenChange(false);
                      }}
                      className="group flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                    >
                      <span
                        className={cx(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ring-1",
                          critical
                            ? "bg-rose-400/10 text-rose-300 ring-rose-400/20"
                            : alert.type === "renovacao"
                              ? "bg-amber-400/10 text-amber-300 ring-amber-400/20"
                              : "bg-white/[0.05] text-text-secondary ring-white/10",
                        )}
                      >
                        {alert.type === "renovacao" ? (
                          <RiCalendarLine className="size-4" aria-hidden />
                        ) : critical ? (
                          <RiAlertLine className="size-4" aria-hidden />
                        ) : (
                          <RiTimeLine className="size-4" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-semibold text-text-primary">
                            {alert.customerName}
                          </span>
                          <SeverityPill severity={alert.severity} />
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-text-secondary">{alert.title}</span>
                        <span className="mt-0.5 block truncate text-[10.5px] text-text-tertiary">
                          {formatCurrency(alert.mrr)} MRR · {alert.description}
                        </span>
                      </span>
                      <RiArrowRightLine className="mt-2 size-3.5 shrink-0 text-text-disabled transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-white/[0.07] p-3">
          <Button
            variant="secondary"
            className="w-full"
            trailingIcon={RiArrowRightLine}
            onClick={() => {
              onSeeTasks();
              onOpenChange(false);
            }}
          >
            Abrir tarefas e próximos passos
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
