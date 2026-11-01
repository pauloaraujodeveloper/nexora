import type { CustomerHealth } from "./selectors";
import { customerAlerts } from "./selectors";
import type { Interaction, OnboardingStep, Opportunity, OrgSettings } from "./types";
import { daysUntil } from "./format";

export type OrgAlert = {
  id: string;
  customerId: string;
  customerName: string;
  type: string;
  severity: "critica" | "alta" | "media" | "baixa";
  title: string;
  description: string;
  mrr: number;
};

const SEVERITY_ORDER = { critica: 0, alta: 1, media: 2, baixa: 3 } as const;

export function buildAlerts(
  customers: CustomerHealth[],
  interactions: Interaction[],
  steps: OnboardingStep[],
  opportunities: Opportunity[],
  settings: OrgSettings,
): OrgAlert[] {
  const alerts: OrgAlert[] = [];
  for (const item of customers) {
    if (item.customer.status === "cancelado") continue;
    const list = customerAlerts(item, interactions, steps, opportunities, settings);
    for (const alert of list) {
      alerts.push({
        id: `${item.customer.id}:${alert.type}`,
        customerId: item.customer.id,
        customerName: item.customer.tradeName,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        mrr: item.customer.mrr,
      });
    }
  }
  return alerts.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.mrr - a.mrr,
  );
}

export function renewalAlerts(customers: CustomerHealth[], days = 45): OrgAlert[] {
  return customers
    .filter(({ customer }) => {
      if (customer.status === "cancelado") return false;
      const until = daysUntil(customer.renewalDate);
      return until >= 0 && until <= days;
    })
    .map(({ customer }): OrgAlert => ({
      id: `${customer.id}:renovacao_janela`,
      customerId: customer.id,
      customerName: customer.tradeName,
      type: "renovacao",
      severity: daysUntil(customer.renewalDate) <= 20 ? "alta" : "media",
      title: `Renovação em ${daysUntil(customer.renewalDate)} dias`,
      description: `Contrato de ${customer.tradeName} vence em breve.`,
      mrr: customer.mrr,
    }))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.mrr - a.mrr);
}

export function alertCounts(alerts: OrgAlert[]) {
  return {
    total: alerts.length,
    critical: alerts.filter((alert) => alert.severity === "critica").length,
    high: alerts.filter((alert) => alert.severity === "alta").length,
  };
}
