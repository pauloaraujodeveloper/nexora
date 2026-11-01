import { bandOf, daysBetween, daysUntil, isoDaysAgo, lastMonths, monthLabel } from "./format";
import { computeHealth, latestScore } from "./health";
import type {
  Customer,
  CustomerFilters,
  DashboardFilters,
  HealthBand,
  HealthScore,
  Interaction,
  OnboardingStep,
  Opportunity,
  OrgSettings,
  Task,
  User,
} from "./types";

export type CustomerHealth = {
  customer: Customer;
  health: ReturnType<typeof computeHealth>;
  latest: HealthScore | undefined;
  owner: User | undefined;
  daysWithoutContact: number;
};

export function buildCustomerHealth(
  customers: Customer[],
  scores: HealthScore[],
  interactions: Interaction[],
  steps: OnboardingStep[],
  settings: OrgSettings,
  users: User[],
): CustomerHealth[] {
  return customers.map((customer) => {
    const customerInteractions = interactions.filter((item) => item.customerId === customer.id);
    const customerSteps = steps.filter((item) => item.customerId === customer.id);
    const health = computeHealth(customer, customerInteractions, customerSteps, settings);
    return {
      customer,
      health,
      latest: latestScore(scores, customer.id),
      owner: users.find((user) => user.id === customer.ownerId),
      daysWithoutContact: health.daysWithoutContact,
    };
  });
}

export function filterCustomers(
  items: CustomerHealth[],
  filters: CustomerFilters,
  contacts: { customerId: string; name: string; email: string }[] = [],
) {
  const q = filters.q.trim().toLowerCase();
  return items.filter(({ customer, health, owner }) => {
    if (q) {
      const contactText = contacts
        .filter((contact) => contact.customerId === customer.id)
        .map((contact) => `${contact.name} ${contact.email}`)
        .join(" ");
      const haystack = [
        customer.tradeName,
        customer.legalName,
        customer.document,
        customer.segment,
        customer.city,
        customer.state,
        customer.plan,
        customer.tags.join(" "),
        owner?.name ?? "",
        contactText,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.status !== "todos" && customer.status !== filters.status) return false;
    if (filters.band !== "todas" && health.band !== filters.band) return false;
    if (filters.segment && customer.segment !== filters.segment) return false;
    if (filters.owner && customer.ownerId !== filters.owner) return false;
    if (filters.state && customer.state !== filters.state) return false;
    if (filters.tag && !customer.tags.includes(filters.tag)) return false;
    if (filters.lastContact !== "todos") {
      const limit = Number(filters.lastContact);
      if (health.daysWithoutContact < limit) return false;
    }
    return true;
  });
}

export function dashboardData(
  customers: CustomerHealth[],
  interactions: Interaction[],
  onboardingSteps: OnboardingStep[],
  opportunities: Opportunity[],
  tasks: Task[],
  filters: DashboardFilters,
  settings: OrgSettings,
) {
  const scoped = customers.filter(({ customer }) => {
    if (filters.owner && customer.ownerId !== filters.owner) return false;
    if (filters.segment && customer.segment !== filters.segment) return false;
    if (filters.plan && customer.plan !== filters.plan) return false;
    return true;
  });

  const active = scoped.filter(({ customer }) => customer.status === "ativo" || customer.status === "em_risco");
  const atRisk = scoped.filter(({ customer, health }) => customer.status === "em_risco" || health.band === "risco");
  const onboarding = scoped.filter(({ customer }) => customer.status === "onboarding");
  const canceled = scoped.filter(({ customer }) => customer.status === "cancelado");
  const mrrTotal = active.reduce((sum, item) => sum + item.customer.mrr, 0);
  const mrrAtRisk = atRisk.reduce((sum, item) => sum + item.customer.mrr, 0);
  const avgHealth = scoped.length
    ? Math.round(scoped.reduce((sum, item) => sum + item.health.score, 0) / scoped.length)
    : 0;
  const renewals = scoped
    .filter(({ customer }) => customer.status !== "cancelado" && daysUntil(customer.renewalDate) >= 0 && daysUntil(customer.renewalDate) <= 90)
    .sort((a, b) => daysUntil(a.customer.renewalDate) - daysUntil(b.customer.renewalDate));
  const renewalValue = renewals.reduce((sum, item) => sum + item.customer.mrr * 12, 0);

  const statusDistribution = [
    { key: "ativo", label: "Ativos", value: active.filter((item) => item.customer.status === "ativo").length, color: "#34d399" },
    { key: "em_risco", label: "Em risco", value: scoped.filter((item) => item.customer.status === "em_risco").length, color: "#fb7185" },
    { key: "onboarding", label: "Onboarding", value: onboarding.length, color: "#fbbf24" },
    { key: "cancelado", label: "Cancelados", value: canceled.length, color: "#6f82a8" },
  ];

  const months = lastMonths(12);
  const evolution = months.map((month) => {
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
    const eligible = scoped.filter(({ customer }) => new Date(customer.contractStart) <= end);
    const monthActive = eligible.filter(({ customer }) => {
      if (customer.status === "cancelado") {
        return customer.canceledAt ? new Date(customer.canceledAt) > end : false;
      }
      return true;
    });
    const monthRisk = monthActive.filter(({ customer, latest }) => {
      const score = latest?.score ?? 70;
      return customer.status === "em_risco" || score < 50;
    });
    const monthCanceled = eligible.filter(({ customer }) => customer.canceledAt && new Date(customer.canceledAt) <= end);
    return {
      label: monthLabel(month),
      active: monthActive.length,
      risk: monthRisk.length,
      canceled: monthCanceled.length,
      mrr: monthActive.reduce((sum, item) => sum + item.customer.mrr, 0),
    };
  });

  const segmentMap = new Map<string, { total: number; count: number }>();
  for (const item of scoped) {
    const entry = segmentMap.get(item.customer.segment) ?? { total: 0, count: 0 };
    entry.total += item.health.score;
    entry.count += 1;
    segmentMap.set(item.customer.segment, entry);
  }
  const healthBySegment = [...segmentMap.entries()]
    .map(([segment, value]) => ({ segment, score: Math.round(value.total / value.count), count: value.count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const onboardingFunnel = settings.onboardingTemplate.map((step) => ({ label: step.name, value: 0 }));
  let onboardingCompleted = 0;
  for (const item of scoped) {
    const steps = onboardingSteps
      .filter((step) => step.customerId === item.customer.id)
      .sort((a, b) => a.position - b.position);
    if (steps.length === 0) continue;
    const firstOpen = steps.find((step) => step.status !== "concluida");
    if (!firstOpen) {
      onboardingCompleted += 1;
      continue;
    }
    const index = settings.onboardingTemplate.findIndex((step) => step.name === firstOpen.name);
    if (index >= 0) onboardingFunnel[index].value += 1;
  }

  const cancelReasons = [
    { key: "falta_de_uso", label: "Falta de uso", value: 0 },
    { key: "preco", label: "Preço", value: 0 },
    { key: "concorrente", label: "Concorrente", value: 0 },
    { key: "falha_de_suporte", label: "Falha de suporte", value: 0 },
    { key: "fim_de_projeto", label: "Fim de projeto", value: 0 },
    { key: "outro", label: "Outro", value: 0 },
  ];
  for (const item of canceled) {
    const reason = item.customer.cancelReason ?? "outro";
    const entry = cancelReasons.find((item) => item.key === reason);
    if (entry) entry.value += 1;
  }

  const topRisk = scoped
    .filter(({ customer, health }) => customer.status === "em_risco" || health.band === "risco")
    .sort((a, b) => b.customer.mrr - a.customer.mrr)
    .slice(0, 10);

  const noContact = scoped
    .filter(({ customer, daysWithoutContact }) => customer.status !== "cancelado" && daysWithoutContact > settings.contactLimitDays)
    .sort((a, b) => b.daysWithoutContact - a.daysWithoutContact);

  const renewals90 = renewals;

  const recentActivity = interactions
    .filter((item) => scoped.some((entry) => entry.customer.id === item.customerId))
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
    .slice(0, 12);

  const openTasks = tasks
    .filter((task) => task.status !== "concluida" && scoped.some((entry) => entry.customer.id === task.customerId))
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));

  const openPipeline = opportunities.filter(
    (item) => item.stage !== "ganha" && item.stage !== "perdida" && scoped.some((entry) => entry.customer.id === item.customerId),
  );

  const scoreBuckets = { saudavel: 0, atencao: 0, risco: 0 };
  for (const item of scoped) scoreBuckets[item.health.band] += 1;

  const previousAverage = scoped.length
    ? Math.round(
        scoped.reduce((sum, item) => {
          const history = item.latest ? item.latest.score : item.health.score;
          return sum + history;
        }, 0) / scoped.length,
      )
    : 0;

  return {
    scoped,
    active,
    atRisk,
    onboarding,
    canceled,
    mrrTotal,
    mrrAtRisk,
    avgHealth,
    previousAverage,
    statusDistribution,
    evolution,
    healthBySegment,
    onboardingFunnel,
    onboardingCompleted,
    cancelReasons,
    topRisk,
    noContact,
    renewals: renewals90,
    renewalValue,
    recentActivity,
    openTasks,
    openPipeline,
    scoreBuckets,
    counts: {
      active: active.length,
      risk: atRisk.length,
      onboarding: onboarding.length,
      canceled: canceled.length,
      renewals: renewals90.length,
      noContact: noContact.length,
    },
  };
}

export function customerAlerts(
  customer: CustomerHealth,
  interactions: Interaction[],
  steps: OnboardingStep[],
  opportunities: Opportunity[],
  settings: OrgSettings,
) {
  const alerts: Array<{ type: string; severity: "critica" | "alta" | "media" | "baixa"; title: string; description: string }> = [];
  if (customer.customer.status === "cancelado") return alerts;
  if (settings.alerts.noContact && customer.daysWithoutContact > settings.contactLimitDays) {
    const hasContact = Boolean(customer.customer.lastContactAt);
    alerts.push({
      type: "sem_contato",
      severity: hasContact && customer.daysWithoutContact > 60 ? "critica" : "alta",
      title: hasContact
        ? `Sem contato há ${customer.daysWithoutContact} dias`
        : "Nenhum contato registrado",
      description: "O limite configurado de contato foi ultrapassado.",
    });
  }
  const late = steps.filter((step) => step.status !== "concluida" && +new Date(step.dueDate) < Date.now());
  if (settings.alerts.onboardingLate && late.length > 0) {
    alerts.push({
      type: "onboarding_atrasado",
      severity: late.length > 1 ? "alta" : "media",
      title: `${late.length} etapa(s) de onboarding em atraso`,
      description: `Etapa atual: ${late[0].name}.`,
    });
  }
  if (settings.alerts.scoreDrop && customer.health.band === "risco") {
    alerts.push({
      type: "queda_score",
      severity: "critica",
      title: `Health score em ${customer.health.score}`,
      description: customer.health.topFactors[0] ?? "Score abaixo da faixa saudável.",
    });
  }
  const renewalDays = daysUntil(customer.customer.renewalDate);
  if (settings.alerts.renewal && renewalDays >= 0 && renewalDays <= 60) {
    alerts.push({
      type: "renovacao",
      severity: renewalDays <= 30 ? "alta" : "media",
      title: `Renovação em ${renewalDays} dias`,
      description: "Contrato próximo do vencimento.",
    });
  }
  if (customer.customer.criticalTickets > 0) {
    alerts.push({
      type: "risco_critico",
      severity: "critica",
      title: `${customer.customer.criticalTickets} ticket(s) crítico(s)`,
      description: "Escalar com o time de suporte e comunicar prazo ao cliente.",
    });
  }
  const lastTwo = interactions
    .filter((item) => item.customerId === customer.customer.id && item.type !== "nota")
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
    .slice(0, 2);
  if (lastTwo.length === 2 && lastTwo.every((item) => item.sentiment === "negativo")) {
    alerts.push({
      type: "sentimento",
      severity: "alta",
      title: "Duas interações negativas seguidas",
      description: "Risco elevado de insatisfação. Revisar plano de ação.",
    });
  }
  const openOpp = opportunities.filter((item) => item.customerId === customer.customer.id && !["ganha", "perdida"].includes(item.stage));
  if (openOpp.length > 0) {
    alerts.push({
      type: "oportunidade",
      severity: "baixa",
      title: `${openOpp.length} oportunidade(s) em aberto`,
      description: "Há receita de expansão ou renovação em jogo.",
    });
  }
  return alerts;
}

export function contactHeatmap(
  scoped: CustomerHealth[],
  interactions: Interaction[],
  weeks = 8,
  limit = 10,
) {
  const top = [...scoped]
    .filter(({ customer }) => customer.status !== "cancelado")
    .sort((a, b) => b.customer.mrr - a.customer.mrr)
    .slice(0, limit);
  const now = new Date();
  const weekStarts = Array.from({ length: weeks }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (weeks - 1 - index) * 7);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const rows = top.map(({ customer }) => {
    const values = weekStarts.map((start) => {
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return interactions.filter(
        (item) =>
          item.customerId === customer.id &&
          +new Date(item.occurredAt) >= +start &&
          +new Date(item.occurredAt) < +end,
      ).length;
    });
    return { customer, values };
  });
  return { weeks: weekStarts, rows };
}

export function bandCounts(items: CustomerHealth[]) {
  const counts: Record<HealthBand, number> = { saudavel: 0, atencao: 0, risco: 0 };
  for (const item of items) counts[item.health.band] += 1;
  return counts;
}

export function churnRate(customers: Customer[], days = 365) {
  const canceled = customers.filter(
    (customer) => customer.canceledAt && daysBetween(customer.canceledAt) <= days,
  );
  const base = customers.filter((customer) => +new Date(customer.contractStart) < +new Date(isoDaysAgo(days))).length || customers.length;
  return (canceled.length / Math.max(base, 1)) * 100;
}

export function scoreBand(score: number, settings: OrgSettings) {
  return bandOf(score, settings.healthyThreshold, settings.attentionThreshold);
}
