import type { ReactNode } from "react";
import { cx } from "@/utils/cx";
import { bandClass, statusClass } from "@/lib/format";
import type { CustomerStatus, HealthBand } from "@/lib/types";

type Tone = "healthy" | "attention" | "risk" | "neutral" | "info" | "violet";

const TONE_CLASS: Record<Tone, string> = {
  healthy: "nx-status-healthy",
  attention: "nx-status-attention",
  risk: "nx-status-risk",
  neutral: "nx-status-neutral",
  info: "nx-status-info",
  violet: "nx-status-violet",
};

export function StatusPill({
  children,
  tone = "neutral",
  dot = true,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={cx("nx-status-pill", TONE_CLASS[tone], className)}>
      {dot && <span className="nx-status-dot" aria-hidden />}
      {children}
    </span>
  );
}

export function CustomerStatusPill({ status }: { status: CustomerStatus }) {
  const tone: Tone =
    status === "ativo" ? "healthy" : status === "em_risco" ? "risk" : status === "onboarding" ? "attention" : "neutral";
  const label = status === "ativo" ? "Ativo" : status === "em_risco" ? "Em risco" : status === "onboarding" ? "Onboarding" : "Cancelado";
  return (
    <span className={cx("nx-status-pill", statusClass(status))}>
      <span className="nx-status-dot" aria-hidden />
      {label}
    </span>
  );
}

export function HealthBandPill({ band, score }: { band: HealthBand; score?: number }) {
  const label = band === "saudavel" ? "Saudável" : band === "atencao" ? "Atenção" : "Risco";
  return (
    <span className={cx("nx-status-pill", bandClass(band))}>
      <span className="nx-status-dot" aria-hidden />
      {label}
      {score != null && <span className="font-normal opacity-70">· {score}</span>}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: "alta" | "media" | "baixa" }) {
  const tone: Tone = priority === "alta" ? "risk" : priority === "media" ? "attention" : "neutral";
  const label = priority === "alta" ? "Alta" : priority === "media" ? "Média" : "Baixa";
  return (
    <StatusPill tone={tone} dot={false} className="px-2 py-0.5 text-[11px]">
      {label}
    </StatusPill>
  );
}

export function SeverityPill({ severity }: { severity: "critica" | "alta" | "media" | "baixa" }) {
  const tone: Tone = severity === "critica" || severity === "alta" ? "risk" : severity === "media" ? "attention" : "neutral";
  const label = severity === "critica" ? "Crítica" : severity === "alta" ? "Alta" : severity === "media" ? "Média" : "Baixa";
  return (
    <StatusPill tone={tone} dot={false} className="px-2 py-0.5 text-[11px]">
      {label}
    </StatusPill>
  );
}
