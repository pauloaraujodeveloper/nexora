import { useMemo, useState } from "react";
import {
  RiAddLine,
  RiArrowRightLine,
  RiCalendarLine,
  RiCheckLine,
  RiCloseLine,
  RiHandCoinLine,
  RiMoneyDollarCircleLine,
  RiPercentLine,
  RiUserStarLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Select, SelectItem } from "@/components/base/select/select";
import { PageHeader } from "@/components/nexora/page-header";
import { KpiStrip } from "@/components/nexora/kpi-strip";
import { CustomerAvatar, OwnerChip, Tag } from "@/components/nexora/misc";
import { EmptyState } from "@/components/nexora/empty-state";
import { useApp, useOrgData } from "@/lib/store";
import { buildCustomerHealth } from "@/lib/selectors";
import { formatCurrency, formatDate, opportunityStageLabel, opportunityTypeLabel } from "@/lib/format";
import { useMotionEnabled, useReveal } from "@/lib/motion";
import type { OpportunityStage } from "@/lib/types";
import { navigate } from "@/lib/router";
import { OpportunityModal } from "@/components/modals/action-modals";
import { toast } from "@/components/base/toast/toast";
import { cx } from "@/utils/cx";

const STAGES: { id: OpportunityStage; label: string; tone: string }[] = [
  { id: "identificada", label: "Identificada", tone: "bg-slate-400" },
  { id: "em_conversa", label: "Em conversa", tone: "bg-brand-cyan" },
  { id: "proposta", label: "Proposta", tone: "bg-brand-violet" },
  { id: "ganha", label: "Ganha", tone: "bg-emerald-400" },
  { id: "perdida", label: "Perdida", tone: "bg-rose-400" },
];

export function OpportunitiesPage() {
  const { settings, dispatch } = useApp();
  const data = useOrgData();
  const motion = useMotionEnabled(settings?.reduceMotion);
  const [owner, setOwner] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<OpportunityStage | null>(null);

  const health = useMemo(
    () =>
      settings
        ? buildCustomerHealth(
            data.customers,
            data.scores,
            data.interactions,
            data.onboardingSteps,
            settings,
            data.users,
          )
        : [],
    [data, settings],
  );

  const revealRef = useReveal<HTMLDivElement>(motion, owner);

  const opportunities = data.opportunities
    .filter((opportunity) => (owner === "todos" ? true : opportunity.ownerId === owner))
    .sort((a, b) => b.value - a.value);

  const open = opportunities.filter((item) => !["ganha", "perdida"].includes(item.stage));
  const won = opportunities.filter((item) => item.stage === "ganha");
  const lost = opportunities.filter((item) => item.stage === "perdida");
  const totalOpen = open.reduce((sum, item) => sum + item.value, 0);
  const weighted = open.reduce((sum, item) => sum + (item.value * item.probability) / 100, 0);
  const winRate = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0;

  function moveTo(id: string, stage: OpportunityStage) {
    const opportunity = data.opportunities.find((item) => item.id === id);
    if (!opportunity || opportunity.stage === stage) return;
    dispatch({ type: "updateOpportunity", id, patch: { stage } });
    toast.success("Oportunidade movida", {
      description: `${opportunity.title} → ${opportunityStageLabel[stage]}`,
    });
  }

  return (
    <div ref={revealRef} className="space-y-4 pt-3">
      <PageHeader
        eyebrow="Receita"
        title="Oportunidades"
        description="Expansão, cross-sell e renovação em um pipeline único, conectado à saúde de cada conta."
        actions={
          <Button size="medium" leadingIcon={RiAddLine} onClick={() => setModalOpen(true)}>
            Nova oportunidade
          </Button>
        }
      />

      <KpiStrip
        items={[
          {
            label: "Pipeline aberto",
            value: formatCurrency(totalOpen),
            numeric: totalOpen,
            format: (value) => formatCurrency(value),
            hint: `${open.length} oportunidades`,
            icon: RiHandCoinLine,
            tone: "cyan",
            animate: motion,
          },
          {
            label: "Receita ponderada",
            value: formatCurrency(weighted),
            numeric: weighted,
            format: (value) => formatCurrency(value),
            hint: "Valor × probabilidade",
            icon: RiMoneyDollarCircleLine,
            tone: "violet",
            animate: motion,
          },
          {
            label: "Taxa de ganho",
            value: `${winRate.toFixed(0)}%`,
            numeric: winRate,
            format: (value) => `${Math.round(value)}%`,
            hint: `${won.length} ganhas · ${lost.length} perdidas`,
            icon: RiPercentLine,
            tone: "green",
            animate: motion,
          },
          {
            label: "Ticket médio",
            value: formatCurrency(open.length ? totalOpen / open.length : 0),
            numeric: open.length ? totalOpen / open.length : 0,
            format: (value) => formatCurrency(value),
            hint: "Média do pipeline aberto",
            icon: RiUserStarLine,
            tone: "amber",
            animate: motion,
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {STAGES.map((stage) => {
            const count = opportunities.filter((item) => item.stage === stage.id).length;
            return (
              <span key={stage.id} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10.5px] text-text-secondary">
                <span className={cx("size-1.5 rounded-full", stage.tone)} />
                {stage.label}
                <span className="font-semibold text-text-primary">{count}</span>
              </span>
            );
          })}
        </div>
        <Select aria-label="Responsável" size="sm" selectedKey={owner} onSelectionChange={(key) => setOwner(String(key))} className="w-[180px]">
          <SelectItem id="todos">Todos os responsáveis</SelectItem>
          {data.users.map((user) => (
            <SelectItem key={user.id} id={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className="nx-scroll grid grid-cols-1 gap-3 overflow-x-auto pb-2 md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((stage) => {
          const items = opportunities.filter((item) => item.stage === stage.id);
          const value = items.reduce((sum, item) => sum + item.value, 0);
          return (
            <div
              key={stage.id}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(stage.id);
              }}
              onDragLeave={() => setDragOver((current) => (current === stage.id ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain") || dragging;
                if (id) moveTo(id, stage.id);
                setDragging(null);
                setDragOver(null);
              }}
              className={cx(
                "flex min-h-[280px] flex-col rounded-2xl border bg-white/[0.015] p-2 transition-colors",
                dragOver === stage.id ? "border-accent-400/50 bg-accent-500/[0.06]" : "border-white/[0.06]",
              )}
            >
              <div className="flex items-center justify-between gap-2 px-1 py-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-text-primary">
                  <span className={cx("size-2 rounded-full", stage.tone)} />
                  {stage.label}
                </span>
                <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                  {items.length}
                </span>
              </div>
              <p className="mb-2 px-1 text-[10px] text-text-tertiary">{formatCurrency(value)}</p>

              <div className="flex flex-1 flex-col gap-2">
                {items.map((opportunity) => {
                  const customer = data.customers.find((entry) => entry.id === opportunity.customerId);
                  const ownerUser = data.users.find((user) => user.id === opportunity.ownerId);
                  const customerHealth = health.find((entry) => entry.customer.id === opportunity.customerId);
                  return (
                    <article
                      key={opportunity.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", opportunity.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDragging(opportunity.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDragOver(null);
                      }}
                      className={cx(
                        "glass-card group cursor-grab p-2.5 transition-transform active:cursor-grabbing",
                        dragging === opportunity.id && "opacity-50",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {customer ? <CustomerAvatar customer={customer} size={28} /> : null}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[11.5px] leading-snug font-semibold text-text-primary">
                            {opportunity.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => customer && navigate(`clientes/${customer.id}?tab=oportunidades`)}
                            className="mt-0.5 truncate text-[10px] text-text-tertiary hover:text-accent-200"
                          >
                            {customer?.tradeName ?? "Cliente"}
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="font-display text-[14px] font-bold text-text-primary tabular-nums">
                          {formatCurrency(opportunity.value)}
                        </span>
                        <Tag>{opportunityTypeLabel[opportunity.type]}</Tag>
                      </div>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full brand-gradient-bar" style={{ width: `${opportunity.probability}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <OwnerChip user={ownerUser} compact />
                        <span className="flex items-center gap-1 text-[9.5px] text-text-tertiary">
                          <RiCalendarLine className="size-2.5" aria-hidden />
                          {formatDate(opportunity.expectedClose)}
                        </span>
                      </div>
                      {customerHealth && customerHealth.health.band === "risco" ? (
                        <p className="mt-1.5 rounded bg-rose-400/10 px-1.5 py-0.5 text-[9px] text-rose-300">
                          Conta em risco · validar expansão
                        </p>
                      ) : null}
                      {stage.id !== "ganha" && stage.id !== "perdida" ? (
                        <div className="mt-2 flex items-center gap-1 border-t border-white/[0.06] pt-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => moveTo(opportunity.id, stage.id === "identificada" ? "em_conversa" : stage.id === "em_conversa" ? "proposta" : "ganha")}
                            className="flex flex-1 items-center justify-center gap-1 rounded px-1 py-0.5 text-[9.5px] text-emerald-300 hover:bg-emerald-400/10"
                          >
                            <RiCheckLine className="size-2.5" aria-hidden /> Avançar
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTo(opportunity.id, "perdida")}
                            className="flex items-center justify-center gap-1 rounded px-1 py-0.5 text-[9.5px] text-rose-300 hover:bg-rose-400/10"
                          >
                            <RiCloseLine className="size-2.5" aria-hidden /> Perder
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}

                {items.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/[0.08] px-3 py-6 text-center text-[10.5px] text-text-tertiary">
                    Arraste uma oportunidade para cá
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {opportunities.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={RiHandCoinLine}
            title="Nenhuma oportunidade"
            description="Crie a primeira oportunidade para acompanhar expansão e renovação."
            action={
              <Button variant="secondary" size="small" onClick={() => setModalOpen(true)}>
                Criar oportunidade
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10.5px] text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <RiArrowRightLine className="size-3.5 text-brand-cyan" aria-hidden />
            Arraste os cartões entre colunas para atualizar o estágio.
          </span>
          <span className="ml-auto">Pipeline total {formatCurrency(opportunities.reduce((sum, item) => sum + item.value, 0))}</span>
        </div>
      )}

      {modalOpen ? (
        <OpportunityModal
          isOpen={modalOpen}
          onOpenChange={setModalOpen}
          orgId={data.orgId}
          customers={data.customers}
          users={data.users}
        />
      ) : null}
    </div>
  );
}
