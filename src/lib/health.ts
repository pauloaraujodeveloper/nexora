import { bandOf, clamp, daysBetween } from "./format";
import type {
  Customer,
  HealthBand,
  HealthScore,
  Interaction,
  OnboardingStep,
  OrgSettings,
  ScoreComponent,
  ScoreWeights,
} from "./types";

export type HealthResult = {
  score: number;
  band: HealthBand;
  components: ScoreComponent[];
  topFactors: string[];
  probability: "baixa" | "media" | "alta";
  daysWithoutContact: number;
};

const DEFAULT_WEIGHTS: ScoreWeights = {
  contact: 25,
  onboarding: 20,
  usage: 20,
  support: 15,
  finance: 10,
  sentiment: 10,
};

function sentimentValue(interactions: Interaction[]) {
  const recent = interactions
    .filter((item) => item.type !== "nota")
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
    .slice(0, 5);
  if (recent.length === 0) return { value: 55, detail: "Sem interações registradas" };
  const map = { positivo: 100, neutro: 60, negativo: 20 } as const;
  const avg = recent.reduce((sum, item) => sum + map[item.sentiment], 0) / recent.length;
  return {
    value: Math.round(avg),
    detail: `${recent.filter((item) => item.sentiment === "positivo").length} positivas de ${recent.length} recentes`,
  };
}

export function computeHealth(
  customer: Customer,
  interactions: Interaction[],
  steps: OnboardingStep[],
  settings?: OrgSettings,
): HealthResult {
  const weights = settings?.scoreWeights ?? DEFAULT_WEIGHTS;
  const healthy = settings?.healthyThreshold ?? 80;
  const attention = settings?.attentionThreshold ?? 50;
  const contactLimit = settings?.contactLimitDays ?? 30;
  const days = daysBetween(customer.lastContactAt);
  const daysWithoutContact = Number.isFinite(days) ? days : 999;

  let contactValue = 10;
  let contactDetail = "Sem contato registrado";
  if (daysWithoutContact <= 15) {
    contactValue = 100;
    contactDetail = `Último contato há ${daysWithoutContact} dias`;
  } else if (daysWithoutContact <= 30) {
    contactValue = 70;
    contactDetail = `Último contato há ${daysWithoutContact} dias`;
  } else if (daysWithoutContact <= 60) {
    contactValue = 40;
    contactDetail = `Sem contato há ${daysWithoutContact} dias`;
  } else if (!Number.isFinite(days)) {
    contactValue = 10;
    contactDetail = "Sem contato registrado";
  } else {
    contactValue = 10;
    contactDetail = `Sem contato há ${daysWithoutContact} dias`;
  }

  const totalSteps = steps.length;
  const completed = steps.filter((step) => step.status === "concluida").length;
  const lateSteps = steps.filter(
    (step) => step.status !== "concluida" && +new Date(step.dueDate) < Date.now(),
  ).length;
  let onboardingValue = 100;
  let onboardingDetail = "Implantação concluída";
  if (customer.status === "cancelado") {
    onboardingValue = 0;
    onboardingDetail = "Cliente cancelado";
  } else if (customer.status === "onboarding") {
    onboardingValue = clamp(Math.round((completed / Math.max(totalSteps, 1)) * 100) - (lateSteps > 0 ? 20 : 0));
    onboardingDetail = `${completed}/${totalSteps} etapas · ${lateSteps} em atraso`;
  } else if (totalSteps > 0) {
    onboardingValue = clamp(100 - lateSteps * 10);
    onboardingDetail = `${completed}/${totalSteps} etapas concluídas`;
  }

  const supportValue = clamp(100 - customer.openTickets * 8 - customer.criticalTickets * 25);
  const financeMap = { em_dia: 100, atraso_curto: 50, atraso_longo: 0 } as const;
  const financeValue = financeMap[customer.paymentStatus];
  const sentiment = sentimentValue(interactions);
  const npsBoost = customer.nps != null ? customer.nps * 10 : null;
  const sentimentValueFinal =
    npsBoost != null ? Math.round(sentiment.value * 0.65 + npsBoost * 0.35) : sentiment.value;

  const components: ScoreComponent[] = [
    {
      key: "contact",
      label: "Contato recente",
      value: contactValue,
      weight: weights.contact,
      points: 0,
      detail: contactDetail,
    },
    {
      key: "onboarding",
      label: "Onboarding",
      value: onboardingValue,
      weight: weights.onboarding,
      points: 0,
      detail: onboardingDetail,
    },
    {
      key: "usage",
      label: "Uso do produto",
      value: customer.usageIndex,
      weight: weights.usage,
      points: 0,
      detail: `Índice de uso em ${customer.usageIndex}/100`,
    },
    {
      key: "support",
      label: "Suporte",
      value: supportValue,
      weight: weights.support,
      points: 0,
      detail: `${customer.openTickets} abertos · ${customer.criticalTickets} críticos`,
    },
    {
      key: "finance",
      label: "Financeiro",
      value: financeValue,
      weight: weights.finance,
      points: 0,
      detail:
        customer.paymentStatus === "em_dia"
          ? "Pagamentos em dia"
          : customer.paymentStatus === "atraso_curto"
            ? "Atraso curto"
            : "Atraso longo",
    },
    {
      key: "sentiment",
      label: "Sentimento",
      value: sentimentValueFinal,
      weight: weights.sentiment,
      points: 0,
      detail: `${sentiment.detail}${customer.nps != null ? ` · NPS ${customer.nps}` : ""}`,
    },
  ];

  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0) || 100;
  for (const component of components) {
    component.points = Math.round(((component.value * component.weight) / totalWeight) * 10) / 10;
  }

  let score = Math.round(components.reduce((sum, component) => sum + component.points, 0));
  if (customer.status === "cancelado") score = Math.min(score, 25);
  score = clamp(score);
  const band = bandOf(score, healthy, attention);

  const topFactors = [...components]
    .sort((a, b) => a.value - b.value)
    .slice(0, 3)
    .map((component) => `${component.detail} (${component.label.toLowerCase()})`);

  let probability: HealthResult["probability"] = score < 50 ? "alta" : score < 70 ? "media" : "baixa";
  const renewalSoon = customer.renewalDate
    ? (+new Date(customer.renewalDate) - Date.now()) / 86_400_000 <= 60
    : false;
  const lastTwo = interactions
    .filter((item) => item.type !== "nota")
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt))
    .slice(0, 2);
  const twoNegative = lastTwo.length === 2 && lastTwo.every((item) => item.sentiment === "negativo");
  if ((renewalSoon || twoNegative) && probability !== "alta") {
    probability = probability === "baixa" ? "media" : "alta";
  }

  return {
    score,
    band,
    components,
    topFactors,
    probability,
    daysWithoutContact: Number.isFinite(daysWithoutContact) ? daysWithoutContact : 999,
  };
}

export function latestScore(scores: HealthScore[], customerId: string) {
  return scores
    .filter((item) => item.customerId === customerId)
    .sort((a, b) => +new Date(b.calculatedAt) - +new Date(a.calculatedAt))[0];
}

export function scoreHistory(scores: HealthScore[], customerId: string) {
  return scores
    .filter((item) => item.customerId === customerId)
    .sort((a, b) => +new Date(a.calculatedAt) - +new Date(b.calculatedAt));
}

export function healthLabel(score: number, healthy = 80, attention = 50) {
  const band = bandOf(score, healthy, attention);
  return band === "saudavel" ? "Saudável" : band === "atencao" ? "Atenção" : "Em risco";
}
