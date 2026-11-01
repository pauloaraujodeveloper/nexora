import type { ComponentType } from "react";
import {
  RiDashboardLine,
  RiGroupLine,
  RiRocketLine,
  RiHandCoinLine,
  RiCheckboxMultipleLine,
  RiRobot2Line,
  RiSettings3Line,
  RiHistoryLine,
  RiShieldUserLine,
} from "@remixicon/react";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export type NavItem = {
  id: string;
  label: string;
  icon: IconComponent;
  href: string;
  match: string[];
  group: "Operação" | "Inteligência" | "Administração";
  description: string;
  /** When true the item is rendered in the primary sidebar navigation. */
  sidebar?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: RiDashboardLine,
    href: "dashboard",
    match: ["dashboard"],
    group: "Operação",
    description: "Visão executiva da carteira",
    sidebar: true,
  },
  {
    id: "clientes",
    label: "Clientes",
    icon: RiGroupLine,
    href: "clientes",
    match: ["clientes"],
    group: "Operação",
    description: "Carteira completa e Customer 360",
    sidebar: true,
  },
  {
    id: "onboarding",
    label: "Onboarding",
    icon: RiRocketLine,
    href: "onboarding",
    match: ["onboarding"],
    group: "Operação",
    description: "Implantação e go-live",
    sidebar: true,
  },
  {
    id: "oportunidades",
    label: "Oportunidades",
    icon: RiHandCoinLine,
    href: "oportunidades",
    match: ["oportunidades"],
    group: "Operação",
    description: "Pipeline de expansão e renovação",
    sidebar: true,
  },
  {
    id: "tarefas",
    label: "Tarefas",
    icon: RiCheckboxMultipleLine,
    href: "tarefas",
    match: ["tarefas"],
    group: "Operação",
    description: "Próximos passos do time",
    sidebar: true,
  },
  {
    id: "ia",
    label: "IA & MCP",
    icon: RiRobot2Line,
    href: "ia",
    match: ["ia"],
    group: "Inteligência",
    description: "Agentes, tokens e escopos",
  },
  {
    id: "configuracoes",
    label: "Configurações",
    icon: RiSettings3Line,
    href: "configuracoes",
    match: ["configuracoes"],
    group: "Administração",
    description: "Score, alertas e preferências",
  },
  {
    id: "auditoria",
    label: "Auditoria",
    icon: RiHistoryLine,
    href: "auditoria",
    match: ["auditoria"],
    group: "Administração",
    description: "Trilha de ações do sistema",
  },
  {
    id: "admin",
    label: "Admin",
    icon: RiShieldUserLine,
    href: "admin",
    match: ["admin"],
    group: "Administração",
    description: "Organizações e acessos internos",
  },
];

export function findNavItem(path: string) {
  const root = path.split("/")[0] || "dashboard";
  return NAV_ITEMS.find((item) => item.match.includes(root)) ?? NAV_ITEMS[0];
}
