import { useMemo } from "react";
import {
  CommandPalette,
  CommandPaletteItem,
  CommandPaletteSection,
} from "@/components/base/command-palette/command-palette";
import { RiGroupLine, RiArrowRightLine, RiSparklingLine } from "@remixicon/react";
import type { Customer, User } from "@/lib/types";
import { NAV_ITEMS } from "./nav";
import { navigate } from "@/lib/router";
import { formatCurrency } from "@/lib/format";

type CommandMenuProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  users: User[];
  onOpenCustomer: (id: string) => void;
};

export function CommandMenu({ isOpen, onOpenChange, customers, users, onOpenCustomer }: CommandMenuProps) {
  const topCustomers = useMemo(
    () =>
      [...customers]
        .filter((customer) => !customer.archived)
        .sort((a, b) => b.mrr - a.mrr)
        .slice(0, 8),
    [customers],
  );

  const risky = useMemo(
    () =>
      customers
        .filter((customer) => customer.status === "em_risco")
        .sort((a, b) => b.mrr - a.mrr)
        .slice(0, 5),
    [customers],
  );

  function handleAction(key: React.Key) {
    const id = String(key);
    const customerId = id.startsWith("customer-top:")
      ? id.slice("customer-top:".length)
      : id.startsWith("customer-risk:")
        ? id.slice("customer-risk:".length)
        : null;
    if (customerId) {
      onOpenCustomer(customerId);
      return;
    }
    navigate(id);
  }

  return (
    <CommandPalette
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onAction={handleAction}
      aria-label="Busca e comandos"
      placeholder="Buscar clientes, páginas ou ações…"
      emptyState={
        <span className="flex flex-col items-center gap-1 py-6 text-center">
          <RiSparklingLine className="size-5 text-text-tertiary" aria-hidden />
          <span className="text-[12.5px] text-text-secondary">Nenhum resultado encontrado.</span>
        </span>
      }
    >
      <CommandPaletteSection title="Ir para">
        {NAV_ITEMS.map((item) => (
          <CommandPaletteItem key={item.id} id={item.href} icon={item.icon} description={item.description}>
            {item.label}
          </CommandPaletteItem>
        ))}
      </CommandPaletteSection>

      {topCustomers.length > 0 && (
        <CommandPaletteSection title="Clientes por receita">
          {topCustomers.map((customer) => (
            <CommandPaletteItem
              key={customer.id}
              id={`customer-top:${customer.id}`}
              icon={RiGroupLine}
              description={`${formatCurrency(customer.mrr)} MRR · ${customer.segment}`}
            >
              {customer.tradeName}
            </CommandPaletteItem>
          ))}
        </CommandPaletteSection>
      )}

      {risky.length > 0 && (
        <CommandPaletteSection title="Precisam de atenção">
          {risky.map((customer) => {
            const owner = users.find((user) => user.id === customer.ownerId);
            return (
              <CommandPaletteItem
                key={customer.id}
                id={`customer-risk:${customer.id}`}
                icon={RiArrowRightLine}
                description={owner ? `CSM ${owner.name}` : "Sem responsável"}
              >
                {customer.tradeName}
              </CommandPaletteItem>
            );
          })}
        </CommandPaletteSection>
      )}
    </CommandPalette>
  );
}
