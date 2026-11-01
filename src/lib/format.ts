import type {
  CancelReason,
  CustomerStatus,
  HealthBand,
  InteractionType,
  OpportunityStage,
  OpportunityType,
  Role,
  Sentiment,
  TaskPriority,
} from "./types";

export const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export const currencyCents = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number, cents = false) {
  return (cents ? currencyCents : currency).format(value || 0);
}

export function compactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(".", ",")} mil`;
  return formatCurrency(value);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatShortDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function daysBetween(from?: string | Date | null, to: Date = new Date()) {
  if (!from) return Number.POSITIVE_INFINITY;
  const date = typeof from === "string" ? new Date(from) : from;
  return Math.floor((to.getTime() - date.getTime()) / 86_400_000);
}

export function daysUntil(value?: string | Date | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = typeof value === "string" ? new Date(value) : value;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export function relativeTime(value?: string | Date | null) {
  if (!value) return "sem registro";
  const days = daysBetween(value);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  if (days < 60) return "há 1 mês";
  return `há ${Math.floor(days / 30)} meses`;
}

export function relativeFuture(value?: string | Date | null) {
  if (!value) return "—";
  const days = daysUntil(value);
  if (days < 0) return `${Math.abs(days)} d em atraso`;
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

export function initials(name: string) {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function pct(value: number, digits = 0) {
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export const statusLabel: Record<CustomerStatus, string> = {
  ativo: "Ativo",
  em_risco: "Em risco",
  onboarding: "Onboarding",
  cancelado: "Cancelado",
};

export const bandLabel: Record<HealthBand, string> = {
  saudavel: "Saudável",
  atencao: "Atenção",
  risco: "Em risco",
};

export const sentimentLabel: Record<Sentiment, string> = {
  positivo: "Positivo",
  neutro: "Neutro",
  negativo: "Negativo",
};

export const interactionLabel: Record<InteractionType, string> = {
  ligacao: "Ligação",
  email: "E-mail",
  reuniao: "Reunião",
  mensagem: "Mensagem",
  visita: "Visita",
  nota: "Nota",
};

export const opportunityTypeLabel: Record<OpportunityType, string> = {
  upsell: "Upsell",
  cross_sell: "Cross-sell",
  renovacao: "Renovação",
  indicacao: "Indicação",
};

export const opportunityStageLabel: Record<OpportunityStage, string> = {
  identificada: "Identificada",
  em_conversa: "Em conversa",
  proposta: "Proposta",
  ganha: "Ganha",
  perdida: "Perdida",
};

export const roleLabel: Record<Role, string> = {
  super_admin: "Super administrador",
  admin: "Administrador",
  gestor: "Gestor",
  csm: "CSM",
  comercial: "Comercial",
  leitura: "Somente leitura",
};

export const priorityLabel: Record<TaskPriority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const cancelReasonLabel: Record<CancelReason, string> = {
  preco: "Preço",
  concorrente: "Concorrente",
  falta_de_uso: "Falta de uso",
  falha_de_suporte: "Falha de suporte",
  fim_de_projeto: "Fim de projeto",
  outro: "Outro",
};

export function bandOf(score: number, healthy = 80, attention = 50): HealthBand {
  if (score >= healthy) return "saudavel";
  if (score >= attention) return "atencao";
  return "risco";
}

export function bandClass(band: HealthBand) {
  return band === "saudavel" ? "nx-status-healthy" : band === "atencao" ? "nx-status-attention" : "nx-status-risk";
}

export function statusClass(status: CustomerStatus) {
  if (status === "ativo") return "nx-status-healthy";
  if (status === "em_risco") return "nx-status-risk";
  if (status === "onboarding") return "nx-status-attention";
  return "nx-status-neutral";
}

export function isoDaysAgo(days: number, hour = 10) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export function isoDaysFromNow(days: number, hour = 10) {
  return isoDaysAgo(-days, hour);
}

export function isoMonthsAgo(months: number) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

export function lastMonths(count: number) {
  const months: Date[] = [];
  const base = new Date();
  base.setDate(1);
  base.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(base);
    date.setMonth(base.getMonth() - i);
    months.push(date);
  }
  return months;
}

export function truncate(value: string, length = 120) {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}

export function maskDocument(document: string) {
  const digits = document.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `${digits.slice(0, 3)}.•••.•••/${digits.slice(-2)}`;
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "••••";
  return `(${digits.slice(0, 2)}) ••••-${digits.slice(-4)}`;
}

export function sortBy<T>(items: T[], pick: (item: T) => number | string, direction: "asc" | "desc" = "asc") {
  return [...items].sort((a, b) => {
    const av = pick(a);
    const bv = pick(b);
    if (typeof av === "number" && typeof bv === "number") return direction === "asc" ? av - bv : bv - av;
    return direction === "asc" ? String(av).localeCompare(String(bv), "pt-BR") : String(bv).localeCompare(String(av), "pt-BR");
  });
}
