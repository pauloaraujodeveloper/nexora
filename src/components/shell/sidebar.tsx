import { useState } from "react";
import {
  RiArrowDownSLine,
  RiBuilding2Line,
  RiCheckLine,
  RiHistoryLine,
  RiLogoutBoxRLine,
  RiRobot2Line,
  RiSettings3Line,
} from "@remixicon/react";
import { cx } from "@/utils/cx";
import { Badge } from "@/components/base/badges/badge";
import {
  Dropdown,
  DropdownDivider,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/components/base/dropdown/dropdown";
import { NexoraWordmark } from "@/components/nexora/brand";
import { UserAvatar } from "@/components/nexora/misc";
import { roleLabel } from "@/lib/format";
import type { Organization, User } from "@/lib/types";
import { NAV_ITEMS } from "./nav";
import { navigate } from "@/lib/router";

type SidebarProps = {
  org: Organization;
  orgs: Organization[];
  user: User;
  activePath: string;
  badges?: Record<string, number>;
  onSwitchOrg: (orgId: string) => void;
  onLogout: () => void;
  onNavigate?: () => void;
};

export function Sidebar({
  org,
  orgs,
  user,
  activePath,
  badges = {},
  onSwitchOrg,
  onLogout,
  onNavigate,
}: SidebarProps) {
  const root = activePath.split("/")[0] || "dashboard";
  const [orgOpen, setOrgOpen] = useState(false);

  function go(href: string) {
    navigate(href);
    onNavigate?.();
  }

  return (
    <aside className="nx-sidebar flex h-full w-full flex-col overflow-hidden rounded-2xl">
      <div className="px-4 pt-4 pb-3">
        <NexoraWordmark />
      </div>

      <div className="px-3">
        <Dropdown isOpen={orgOpen} onOpenChange={setOrgOpen}>
          <DropdownTrigger
            className={cx(
              "flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2",
              "text-left transition-colors hover:border-white/20 hover:bg-white/[0.06]",
            )}
            aria-label="Trocar organização"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-brand-blue/40 to-brand-violet/40 text-accent-200 ring-1 ring-white/10">
              <RiBuilding2Line className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-text-primary">{org.name}</span>
              <span className="block truncate text-[10px] text-text-tertiary">Plano {org.plan}</span>
            </span>
            <RiArrowDownSLine className="size-4 shrink-0 text-text-tertiary" aria-hidden />
          </DropdownTrigger>
          <DropdownPopover aria-label="Organizações" className="w-[248px]">
            <DropdownGroup label="Organizações">
              {orgs.map((item) => (
                <DropdownItem
                  key={item.id}
                  selected={item.id === org.id}
                  onSelect={() => {
                    onSwitchOrg(item.id);
                    setOrgOpen(false);
                  }}
                >
                  <span className="grid size-6 place-items-center rounded-md bg-white/[0.06] text-[10px] font-bold text-text-secondary">
                    {item.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-text-primary">{item.name}</span>
                    <span className="block text-[10px] text-text-tertiary">{item.plan}</span>
                  </span>
                  {item.id === org.id ? <RiCheckLine className="size-3.5 text-accent-300" aria-hidden /> : null}
                </DropdownItem>
              ))}
            </DropdownGroup>
          </DropdownPopover>
        </Dropdown>
      </div>

      <nav className="nx-scroll mt-2 flex-1 overflow-y-auto px-3 pb-3" aria-label="Navegação principal">
        <div className="space-y-0.5">
          {NAV_ITEMS.filter((item) => item.sidebar).map((item) => {
            const active = item.match.includes(root);
            const count = badges[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.href)}
                data-active={active}
                aria-current={active ? "page" : undefined}
                className="nx-nav-item w-full text-left"
              >
                <item.icon className="size-[17px] shrink-0" aria-hidden />
                <span className="flex-1 truncate">{item.label}</span>
                {count > 0 ? <Badge color={active ? "primary" : "neutral"}>{count}</Badge> : null}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/[0.07] p-3">
        <Dropdown>
          <DropdownTrigger
            className="flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-white/[0.05]"
            aria-label="Menu do usuário"
          >
            <UserAvatar user={user} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-text-primary">{user.name}</span>
              <span className="block truncate text-[10px] text-text-tertiary">{roleLabel[user.role]}</span>
            </span>
            <RiArrowDownSLine className="size-4 text-text-tertiary" aria-hidden />
          </DropdownTrigger>
          <DropdownPopover aria-label="Conta" placement="top start" className="w-[248px]">
            <DropdownGroup>
              <div className="px-2 py-1.5">
                <p className="truncate text-[12.5px] font-semibold text-text-primary">{user.name}</p>
                <p className="truncate text-[10.5px] text-text-tertiary">{user.email}</p>
              </div>
            </DropdownGroup>
            <DropdownDivider />
            <DropdownGroup>
              <DropdownItem onSelect={() => go("ia")}>
                <RiRobot2Line className="size-4 text-text-tertiary" aria-hidden />
                IA &amp; MCP
              </DropdownItem>
              <DropdownItem onSelect={() => go("auditoria")}>
                <RiHistoryLine className="size-4 text-text-tertiary" aria-hidden />
                Auditoria
              </DropdownItem>
              <DropdownItem onSelect={() => go("configuracoes")}>
                <RiSettings3Line className="size-4 text-text-tertiary" aria-hidden />
                Configurações
              </DropdownItem>
              <DropdownItem onSelect={() => onLogout()}>
                <RiLogoutBoxRLine className="size-4 text-rose-300" aria-hidden />
                <span className="text-rose-200">Sair da conta</span>
              </DropdownItem>
            </DropdownGroup>
          </DropdownPopover>
        </Dropdown>
      </div>
    </aside>
  );
}
