import { useMemo, useState } from "react";
import {
  RiAddLine,
  RiAlertLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiBriefcaseLine,
  RiCalendarCheckLine,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiFileList3Line,
  RiHeartPulseLine,
  RiMailLine,
  RiMapPinLine,
  RiMessage3Line,
  RiPencilLine,
  RiPhoneLine,
  RiRobot2Line,
  RiSpeedUpLine,
  RiTaskLine,
  RiTeamLine,
  RiTimeLine,
  RiUserStarLine,
} from "@remixicon/react";
import type { ChartOptions } from "chart.js";
import { Button } from "@/components/base/buttons/button";
import { Tabs, Tab, TabList, TabPanel } from "@/components/base/tabs/tabs";
import { toast } from "@/components/base/toast/toast";
import { HealthRing } from "@/components/nexora/health-ring";
import {
  CustomerStatusPill,
  HealthBandPill,
  PriorityPill,
  SeverityPill,
} from "@/components/nexora/status-pill";
import {
  CustomerAvatar,
  InlineProgress,
  MetaItem,
  OwnerChip,
  Tag,
  UserAvatar,
} from "@/components/nexora/misc";
import { SectionCard } from "@/components/nexora/section-card";
import { ChartCanvas } from "@/components/nexora/chart-canvas";
import { EmptyState } from "@/components/nexora/empty-state";
import { useApp, useOrgData } from "@/lib/store";
import { buildCustomerHealth, customerAlerts } from "@/lib/selectors";
import { scoreHistory } from "@/lib/health";
import { areaGradient, chartPalette } from "@/lib/chart";
import {
  cancelReasonLabel,
  daysUntil,
  formatCurrency,
  formatDate,
  formatDateTime,
  interactionLabel,
  opportunityStageLabel,
  opportunityTypeLabel,
  relativeFuture,
  relativeTime,
  sentimentLabel,
} from "@/lib/format";
import { useMotionEnabled, useReveal } from "@/lib/motion";
import type { InteractionType } from "@/lib/types";
import { navigate, useRoute } from "@/lib/router";
import { CustomerModal } from "@/components/modals/customer-modal";
import {
  ContactModal,
  InteractionModal,
  OpportunityModal,
  TaskModal,
} from "@/components/modals/action-modals";
import { cx } from "@/utils/cx";

const INTERACTION_ICON: Record<InteractionType, typeof RiMessage3Line> = {
  reuniao: RiTeamLine,
  ligacao: RiPhoneLine,
  email: RiMailLine,
  mensagem: RiMessage3Line,
  visita: RiMapPinLine,
  nota: RiFileList3Line,
};

const TABS = [
  { id: "resumo", label: "Resumo" },
  { id: "saude", label: "Saúde" },
  { id: "interacoes", label: "Interações" },
  { id: "onboarding", label: "Onboarding" },
  { id: "oportunidades", label: "Oportunidades" },
  { id: "contatos", label: "Contatos" },
  { id: "riscos", label: "Riscos" },
];

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const { settings, currentUser, dispatch } = useApp();
  const data = useOrgData();
  const route = useRoute();
  const motion = useMotionEnabled(settings?.reduceMotion);
  const tab = route.query.get("tab") ?? "resumo";

  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [opportunityOpen, setOpportunityOpen] = useState(false);

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

  const item = health.find((entry) => entry.customer.id === customerId);
  const revealRef = useReveal<HTMLDivElement>(motion, `${customerId}-${tab}`);

  if (!item || !settings) {
    return (
      <div className="pt-3">
        <SectionCard>
          <EmptyState
            title="Conta não encontrada"
            description="Ela pode ter sido arquivada ou pertence a outra organização."
            action={
              <Button variant="secondary" size="small" onClick={() => navigate("clientes")}>
                Voltar para clientes
              </Button>
            }
          />
        </SectionCard>
      </div>
    );
  }

  const { customer, health: score, owner, daysWithoutContact } = item;
  const contacts = data.contacts.filter((contact) => contact.customerId === customer.id);
  const interactions = data.interactions
    .filter((interaction) => interaction.customerId === customer.id)
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  const steps = data.onboardingSteps
    .filter((step) => step.customerId === customer.id)
    .sort((a, b) => a.position - b.position);
  const opportunities = data.opportunities.filter((opportunity) => opportunity.customerId === customer.id);
  const risks = data.risks.filter((risk) => risk.customerId === customer.id);
  const tasks = data.tasks
    .filter((task) => task.customerId === customer.id)
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  const alerts = customerAlerts(item, data.interactions, steps, opportunities, settings);
  const history = scoreHistory(data.scores, customer.id);
  const completedSteps = steps.filter((step) => step.status === "concluida").length;
  const openPipeline = opportunities
    .filter((opportunity) => !["ganha", "perdida"].includes(opportunity.stage))
    .reduce((sum, opportunity) => sum + opportunity.value, 0);

  const historyOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => `Score ${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, maxTicksLimit: 8 } },
      y: {
        min: 0,
        max: 100,
        border: { display: false },
        grid: { color: "rgba(126,148,196,0.08)" },
        ticks: { stepSize: 25 },
      },
    },
  };

  const historyData = {
    labels: history.map((entry) =>
      new Date(entry.calculatedAt).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
    ),
    datasets: [
      {
        label: "Health score",
        data: history.map((entry) => entry.score),
        borderColor: chartPalette.violet,
        backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) =>
          areaGradient(context.chart.ctx, chartPalette.violet, 220),
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  return (
    <div ref={revealRef} className="space-y-4 pt-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="small"
          leadingIcon={RiArrowLeftLine}
          onClick={() => navigate("clientes")}
        >
          Clientes
        </Button>
        <span className="text-text-disabled">/</span>
        <span className="text-[12px] text-text-secondary">{customer.tradeName}</span>
      </div>

      {/* -------------------------------------------------------------- header */}
      <section data-reveal className="glass-card relative overflow-hidden p-4 sm:p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-56 w-72 rounded-full opacity-25 blur-3xl"
          style={{ background: `radial-gradient(circle, ${customer.logoColor}, transparent 70%)` }}
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <CustomerAvatar customer={customer} size={58} className="rounded-2xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-[24px] leading-tight font-bold text-text-primary">
                  {customer.tradeName}
                </h1>
                <CustomerStatusPill status={customer.status} />
                <HealthBandPill band={score.band} />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-text-tertiary">
                <span className="flex items-center gap-1">
                  <RiMapPinLine className="size-3.5" aria-hidden />
                  {customer.city}/{customer.state}
                </span>
                <span>{customer.segment}</span>
                <span>Plano {customer.plan}</span>
                <span>{customer.document}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {customer.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
                {customer.website ? (
                  <a href={customer.website} target="_blank" rel="noreferrer" className="nx-link text-[10.5px]">
                    {customer.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="small" leadingIcon={RiPencilLine} onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            <Button variant="secondary" size="small" leadingIcon={RiTaskLine} onClick={() => setTaskOpen(true)}>
              Tarefa
            </Button>
            <Button size="small" leadingIcon={RiMessage3Line} onClick={() => setInteractionOpen(true)}>
              Registrar interação
            </Button>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2.5 border-t border-white/[0.07] pt-4 sm:grid-cols-3 xl:grid-cols-6">
          <div className="flex items-center gap-2.5">
            <HealthRing score={score.score} band={score.band} size={54} stroke={4.5} animated={motion} label="score" />
            <div>
              <p className="text-[10px] tracking-wider text-text-tertiary uppercase">Health</p>
              <p className="text-[12px] font-semibold text-text-primary">Prob. churn {score.probability}</p>
            </div>
          </div>
          <MetaItem label="MRR">{formatCurrency(customer.mrr)}</MetaItem>
          <MetaItem label="Renovação">
            {formatDate(customer.renewalDate)}
            <span className="ml-1 text-[10px] font-normal text-text-tertiary">({daysUntil(customer.renewalDate)} d)</span>
          </MetaItem>
          <MetaItem label="Responsável">
            <OwnerChip user={owner} />
          </MetaItem>
          <MetaItem label="Último contato">
            {relativeTime(customer.lastContactAt)}
            <span className="ml-1 text-[10px] font-normal text-text-tertiary">({daysWithoutContact} d)</span>
          </MetaItem>
          <MetaItem label="Pipeline aberto">{formatCurrency(openPipeline)}</MetaItem>
        </div>
      </section>

      {/* ---------------------------------------------------------------- tabs */}
      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => navigate(`clientes/${customer.id}?tab=${key}`)}
      >
        <div className="nx-scroll -mx-1 overflow-x-auto px-1">
          <TabList aria-label="Seções do cliente">
            {TABS.map((entry) => (
              <Tab key={entry.id} id={entry.id}>
                {entry.label}
              </Tab>
            ))}
          </TabList>
        </div>

        {/* ---------------------------------------------------------- resumo */}
        <TabPanel id="resumo" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
            <SectionCard title="Fatores que explicam o score" description="Peso de cada dimensão no cálculo atual">
              <ul className="space-y-3">
                {score.components.map((component) => (
                  <li key={component.key}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11.5px]">
                      <span className="flex items-center gap-1.5 text-text-secondary">
                        <span className="font-medium text-text-primary">{component.label}</span>
                        <span className="text-text-tertiary">peso {component.weight}%</span>
                      </span>
                      <span className="font-semibold text-text-primary tabular-nums">{component.value}/100</span>
                    </div>
                    <InlineProgress
                      value={component.value}
                      tone={component.value >= 70 ? "green" : component.value >= 40 ? "amber" : "rose"}
                    />
                    <p className="mt-1 text-[10.5px] text-text-tertiary">{component.detail}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <div className="space-y-3">
              <SectionCard
                title="Alertas da conta"
                description={`${alerts.length} sinal(is) ativo(s)`}
                action={
                  <Button variant="ghost" size="xs" onClick={() => navigate(`clientes/${customer.id}?tab=riscos`)}>
                    Riscos
                  </Button>
                }
              >
                {alerts.length ? (
                  <ul className="space-y-2">
                    {alerts.slice(0, 5).map((alert) => (
                      <li key={alert.type} className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                        <span className={cx(
                          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md ring-1",
                          alert.severity === "critica" || alert.severity === "alta"
                            ? "bg-rose-400/10 text-rose-300 ring-rose-400/20"
                            : "bg-white/[0.05] text-text-secondary ring-white/10",
                        )}>
                          {alert.severity === "critica" || alert.severity === "alta" ? (
                            <RiAlertLine className="size-3.5" aria-hidden />
                          ) : (
                            <RiTimeLine className="size-3.5" aria-hidden />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] font-medium text-text-primary">{alert.title}</p>
                          <p className="text-[10px] text-text-tertiary">{alert.description}</p>
                        </div>
                        <SeverityPill severity={alert.severity} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState compact title="Sem alertas" description="A conta está saudável neste momento." />
                )}
              </SectionCard>

              <SectionCard title="Onboarding" description={`${completedSteps} de ${steps.length} etapas concluídas`}>
                <InlineProgress value={(completedSteps / Math.max(1, steps.length)) * 100} tone="brand" />
                <ul className="mt-3 space-y-1.5">
                  {steps.slice(0, 4).map((step) => (
                    <li key={step.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex items-center gap-1.5 text-text-secondary">
                        <span
                          className={cx(
                            "grid size-4 place-items-center rounded-full",
                            step.status === "concluida"
                              ? "bg-emerald-400/15 text-emerald-300"
                              : step.status === "bloqueada"
                                ? "bg-rose-400/15 text-rose-300"
                                : "bg-white/[0.06] text-text-tertiary",
                          )}
                        >
                          {step.status === "concluida" ? <RiCheckLine className="size-2.5" aria-hidden /> : null}
                        </span>
                        {step.name}
                      </span>
                      <span className="text-text-tertiary">{formatDate(step.dueDate)}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <SectionCard
              title="Últimas interações"
              action={
                <Button variant="ghost" size="xs" onClick={() => navigate(`clientes/${customer.id}?tab=interacoes`)}>
                  Ver todas
                </Button>
              }
              padded={false}
            >
              {interactions.length ? (
                <ul className="divide-y divide-white/[0.05]">
                  {interactions.slice(0, 4).map((interaction) => {
                    const Icon = INTERACTION_ICON[interaction.type];
                    return (
                      <li key={interaction.id} className="flex items-start gap-2.5 px-4 py-2.5">
                        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-text-secondary ring-1 ring-white/10">
                          <Icon className="size-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11.5px] font-medium text-text-primary">{interaction.subject}</p>
                          <p className="text-[10px] text-text-tertiary">
                            {relativeTime(interaction.occurredAt)} · {sentimentLabel[interaction.sentiment]}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState compact title="Sem interações" description="Registre a primeira conversa." />
              )}
            </SectionCard>

            <SectionCard title="Contatos" action={<Button variant="ghost" size="xs" onClick={() => setContactOpen(true)}>Adicionar</Button>} padded={false}>
              {contacts.length ? (
                <ul className="divide-y divide-white/[0.05]">
                  {contacts.slice(0, 4).map((contact) => (
                    <li key={contact.id} className="flex items-center gap-2.5 px-4 py-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-text-secondary">
                        {contact.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-medium text-text-primary">
                          {contact.name}
                          {contact.isDecisionMaker ? <span className="ml-1 text-[9px] text-accent-300">decisor</span> : null}
                        </p>
                        <p className="truncate text-[10px] text-text-tertiary">{contact.jobTitle}</p>
                      </div>
                      {contact.isPrimary ? <Tag>principal</Tag> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact title="Sem contatos" description="Adicione quem participa da conta." />
              )}
            </SectionCard>

            <SectionCard title="Oportunidades" action={<Button variant="ghost" size="xs" onClick={() => setOpportunityOpen(true)}>Nova</Button>} padded={false}>
              {opportunities.length ? (
                <ul className="divide-y divide-white/[0.05]">
                  {opportunities.slice(0, 4).map((opportunity) => (
                    <li key={opportunity.id} className="flex items-center gap-2 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-medium text-text-primary">{opportunity.title}</p>
                        <p className="text-[10px] text-text-tertiary">
                          {opportunityTypeLabel[opportunity.type]} · {opportunity.probability}%
                        </p>
                      </div>
                      <span className="text-[11.5px] font-semibold text-text-primary tabular-nums">
                        {formatCurrency(opportunity.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact title="Sem oportunidades" description="Mapeie a próxima expansão." />
              )}
            </SectionCard>
          </div>
        </TabPanel>

        {/* ----------------------------------------------------------- saude */}
        <TabPanel id="saude" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1.6fr]">
            <SectionCard title="Score atual" description="Cálculo explicável com pesos configuráveis">
              <div className="flex flex-col items-center gap-3 py-2">
                <HealthRing score={score.score} band={score.band} size={168} stroke={12} animated={motion} label="de 100" />
                <div className="text-center">
                  <HealthBandPill band={score.band} />
                  <p className="mt-2 text-[11.5px] text-text-secondary">
                    Probabilidade de churn <strong className="text-text-primary">{score.probability}</strong>
                  </p>
                </div>
              </div>
              <div className="mt-2 space-y-2 border-t border-white/[0.06] pt-3">
                {score.topFactors.map((factor) => (
                  <p key={factor} className="flex items-start gap-1.5 text-[11px] text-text-secondary">
                    <RiErrorWarningLine className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden />
                    {factor}
                  </p>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Histórico de 12 meses" description="Evolução do health score calculado">
              {history.length > 1 ? (
                <ChartCanvas
                  type="line"
                  data={historyData}
                  options={historyOptions}
                  height={300}
                  ariaLabel="Histórico de health score"
                />
              ) : (
                <EmptyState compact title="Histórico insuficiente" description="O score será registrado a cada recálculo." />
              )}
            </SectionCard>
          </div>

          <SectionCard title="Composição do score" description="Cada dimensão contribui proporcionalmente ao seu peso">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {score.components.map((component) => (
                <div key={component.key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-medium text-text-primary">{component.label}</span>
                    <span className="text-[10px] text-text-tertiary">{component.points} pts</span>
                  </div>
                  <p className="mt-1 text-[22px] leading-none font-bold text-text-primary tabular-nums">
                    {component.value}
                    <span className="ml-0.5 text-[11px] font-normal text-text-tertiary">/100</span>
                  </p>
                  <InlineProgress
                    className="mt-2"
                    value={component.value}
                    tone={component.value >= 70 ? "green" : component.value >= 40 ? "amber" : "rose"}
                  />
                  <p className="mt-1.5 text-[10.5px] text-text-tertiary">{component.detail}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabPanel>

        {/* ------------------------------------------------------ interacoes */}
        <TabPanel id="interacoes" className="space-y-3">
          <SectionCard
            title="Linha do tempo"
            description={`${interactions.length} interações registradas`}
            action={
              <Button size="small" leadingIcon={RiAddLine} onClick={() => setInteractionOpen(true)}>
                Registrar
              </Button>
            }
            padded={false}
          >
            {interactions.length ? (
              <ol className="relative px-4 py-2 sm:px-5">
                <span aria-hidden className="absolute top-4 bottom-4 left-[30px] w-px bg-white/[0.08] sm:left-[34px]" />
                {interactions.map((interaction) => {
                  const Icon = INTERACTION_ICON[interaction.type];
                  const author = data.users.find((user) => user.id === interaction.createdBy);
                  return (
                    <li key={interaction.id} className="relative flex gap-3 py-3">
                      <span className={cx(
                        "z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-[#0b1120]",
                        interaction.sentiment === "positivo"
                          ? "bg-emerald-400/12 text-emerald-300"
                          : interaction.sentiment === "negativo"
                            ? "bg-rose-400/12 text-rose-300"
                            : "bg-white/[0.06] text-text-secondary",
                      )}>
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[12.5px] font-semibold text-text-primary">{interaction.subject}</p>
                          <Tag>{interactionLabel[interaction.type]}</Tag>
                          {interaction.source === "mcp" ? (
                            <span className="nx-status-pill nx-status-violet px-1.5 py-0 text-[9.5px]">
                              <RiRobot2Line className="size-2.5" aria-hidden /> MCP
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[10.5px] text-text-tertiary">
                          {formatDateTime(interaction.occurredAt)} · {author?.name ?? "Sistema"} ·{" "}
                          {sentimentLabel[interaction.sentiment]}
                        </p>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-text-secondary">{interaction.summary}</p>
                        {interaction.nextSteps ? (
                          <p className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-accent-400/15 bg-accent-500/[0.07] px-2.5 py-1.5 text-[11px] text-accent-100">
                            <RiArrowRightLine className="mt-0.5 size-3 shrink-0" aria-hidden />
                            {interaction.nextSteps}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                icon={RiMessage3Line}
                title="Nenhuma interação"
                description="Registre a primeira conversa para começar a construir o histórico."
                action={
                  <Button variant="secondary" size="small" onClick={() => setInteractionOpen(true)}>
                    Registrar interação
                  </Button>
                }
              />
            )}
          </SectionCard>

          <SectionCard title="Tarefas da conta" padded={false}>
            {tasks.length ? (
              <ul className="divide-y divide-white/[0.05]">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({
                          type: "updateTask",
                          id: task.id,
                          patch: { status: task.status === "concluida" ? "aberta" : "concluida" },
                        });
                      }}
                      className={cx(
                        "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                        task.status === "concluida"
                          ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                          : "border-white/20 text-transparent hover:border-emerald-400 hover:text-emerald-300",
                      )}
                      aria-label={`Alternar ${task.title}`}
                    >
                      <RiCheckLine className="size-3" aria-hidden />
                    </button>
                    <span className={cx("flex-1 text-[12px]", task.status === "concluida" ? "text-text-tertiary line-through" : "text-text-primary")}>
                      {task.title}
                    </span>
                    <span className="text-[10.5px] text-text-tertiary">{relativeFuture(task.dueDate)}</span>
                    <PriorityPill priority={task.priority} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title="Sem tarefas" description="Nenhum próximo passo registrado." />
            )}
          </SectionCard>
        </TabPanel>

        {/* ------------------------------------------------------- onboarding */}
        <TabPanel id="onboarding" className="space-y-3">
          <SectionCard
            title="Implantação"
            description={`${completedSteps}/${steps.length} etapas · ${customer.status === "onboarding" ? "em andamento" : "concluída"}`}
          >
            {steps.length ? (
              <ol className="space-y-2">
                {steps.map((step, index) => {
                  const late = step.status !== "concluida" && +new Date(step.dueDate) < Date.now();
                  return (
                    <li
                      key={step.id}
                      className={cx(
                        "flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center",
                        step.status === "concluida"
                          ? "border-emerald-400/15 bg-emerald-400/[0.05]"
                          : step.status === "bloqueada"
                            ? "border-rose-400/20 bg-rose-400/[0.06]"
                            : late
                              ? "border-amber-400/20 bg-amber-400/[0.05]"
                              : "border-white/[0.07] bg-white/[0.02]",
                      )}
                    >
                      <span className={cx(
                        "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                        step.status === "concluida"
                          ? "bg-emerald-400/20 text-emerald-300"
                          : step.status === "bloqueada"
                            ? "bg-rose-400/20 text-rose-300"
                            : "bg-white/[0.07] text-text-tertiary",
                      )}>
                        {step.status === "concluida" ? <RiCheckLine className="size-3" aria-hidden /> : index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium text-text-primary">{step.name}</p>
                        <p className="text-[10.5px] text-text-tertiary">
                          Prazo {formatDate(step.dueDate)} · {step.status === "concluida" ? `concluída em ${formatDate(step.completedAt)}` : late ? "atrasada" : "no prazo"}
                          {step.blockedReason ? ` · ${step.blockedReason}` : ""}
                        </p>
                      </div>
                      {step.status !== "concluida" ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => {
                              dispatch({
                                type: "updateStep",
                                id: step.id,
                                patch: { status: "concluida", completedAt: new Date().toISOString() },
                              });
                              toast.success("Etapa concluída", { description: step.name });
                            }}
                          >
                            Concluir
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              dispatch({
                                type: "updateStep",
                                id: step.id,
                                patch: { status: "bloqueada", blockedReason: "Bloqueio reportado pelo CSM" },
                              });
                              toast.info("Etapa marcada como bloqueada");
                            }}
                          >
                            Bloquear
                          </Button>
                        </div>
                      ) : (
                        <span className="nx-status-pill nx-status-healthy">
                          <RiCheckboxCircleLine className="size-3" aria-hidden /> Concluída
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState compact title="Sem etapas" description="Esta conta não possui onboarding ativo." />
            )}
          </SectionCard>
        </TabPanel>

        {/* ---------------------------------------------------- oportunidades */}
        <TabPanel id="oportunidades" className="space-y-3">
          <SectionCard
            title="Pipeline da conta"
            description={`${formatCurrency(openPipeline)} em oportunidades abertas`}
            action={
              <Button size="small" leadingIcon={RiAddLine} onClick={() => setOpportunityOpen(true)}>
                Nova oportunidade
              </Button>
            }
            padded={false}
          >
            {opportunities.length ? (
              <ul className="divide-y divide-white/[0.05]">
                {opportunities.map((opportunity) => (
                  <li key={opportunity.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12.5px] font-semibold text-text-primary">{opportunity.title}</p>
                        <Tag>{opportunityTypeLabel[opportunity.type]}</Tag>
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-text-tertiary">
                        {opportunityStageLabel[opportunity.stage]} · fecha em {formatDate(opportunity.expectedClose)} · {opportunity.probability}%
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold text-text-primary tabular-nums">
                      {formatCurrency(opportunity.value)}
                    </span>
                    <InlineProgress value={opportunity.probability} tone="brand" className="w-full sm:w-24" />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={RiBriefcaseLine}
                title="Nenhuma oportunidade"
                description="Identifique expansão, cross-sell ou renovação para esta conta."
                action={
                  <Button variant="secondary" size="small" onClick={() => setOpportunityOpen(true)}>
                    Criar oportunidade
                  </Button>
                }
              />
            )}
          </SectionCard>
        </TabPanel>

        {/* --------------------------------------------------------- contatos */}
        <TabPanel id="contatos" className="space-y-3">
          <SectionCard
            title="Pessoas da conta"
            description={`${contacts.length} contatos cadastrados`}
            action={
              <Button size="small" leadingIcon={RiAddLine} onClick={() => setContactOpen(true)}>
                Adicionar contato
              </Button>
            }
          >
            {contacts.length ? (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {contacts.map((contact) => (
                  <div key={contact.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-accent-500/25 to-brand-cyan/15 text-[12px] font-bold text-text-primary ring-1 ring-white/10">
                        {contact.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex gap-1">
                        {contact.isPrimary ? <Tag>principal</Tag> : null}
                        {contact.isDecisionMaker ? (
                          <span className="inline-flex items-center gap-0.5 rounded-md border border-accent-400/30 bg-accent-500/10 px-1.5 py-0.5 text-[9.5px] text-accent-200">
                            <RiUserStarLine className="size-2.5" aria-hidden /> decisor
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-[12.5px] font-semibold text-text-primary">{contact.name}</p>
                    <p className="text-[10.5px] text-text-tertiary">{contact.jobTitle}</p>
                    <div className="mt-2 space-y-1 text-[11px]">
                      <a href={`mailto:${contact.email}`} className="nx-link flex items-center gap-1.5">
                        <RiMailLine className="size-3" aria-hidden /> {contact.email}
                      </a>
                      {contact.phone ? (
                        <p className="flex items-center gap-1.5 text-text-secondary">
                          <RiPhoneLine className="size-3" aria-hidden /> {contact.phone}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState compact title="Sem contatos" description="Adicione as pessoas envolvidas na conta." />
            )}
          </SectionCard>
        </TabPanel>

        {/* ----------------------------------------------------------- riscos */}
        <TabPanel id="riscos" className="space-y-3">
          <SectionCard title="Riscos mapeados" description="Planos de ação e severidade" padded={false}>
            {risks.length ? (
              <ul className="divide-y divide-white/[0.05]">
                {risks.map((risk) => (
                  <li key={risk.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
                    <span className={cx(
                      "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ring-1",
                      risk.severity === "critica" || risk.severity === "alta"
                        ? "bg-rose-400/10 text-rose-300 ring-rose-400/20"
                        : "bg-amber-400/10 text-amber-300 ring-amber-400/20",
                    )}>
                      <RiAlertLine className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12.5px] font-semibold text-text-primary">{risk.category}</p>
                        <SeverityPill severity={risk.severity} />
                        <Tag>{risk.status}</Tag>
                      </div>
                      <p className="mt-1 text-[11.5px] text-text-secondary">{risk.description}</p>
                      <p className="mt-1 flex items-start gap-1.5 text-[11px] text-text-tertiary">
                        <RiArrowRightLine className="mt-0.5 size-3 shrink-0" aria-hidden />
                        {risk.actionPlan}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={RiHeartPulseLine}
                title="Nenhum risco mapeado"
                description="A conta não tem riscos abertos no momento."
              />
            )}
          </SectionCard>

          {customer.status === "cancelado" ? (
            <SectionCard title="Cancelamento">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-rose-400/10 text-rose-300 ring-1 ring-rose-400/20">
                  <RiErrorWarningLine className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-text-primary">
                    Motivo: {cancelReasonLabel[customer.cancelReason ?? "outro"]}
                  </p>
                  <p className="text-[10.5px] text-text-tertiary">Cancelado em {formatDate(customer.canceledAt)}</p>
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Uso e suporte" description="Sinais operacionais que alimentam o score">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1.5 text-[10.5px] tracking-wider text-text-tertiary uppercase">
                  <RiSpeedUpLine className="size-3" aria-hidden /> Uso do produto
                </p>
                <p className="mt-1 font-display text-[22px] font-bold text-text-primary">{customer.usageIndex}/100</p>
                <InlineProgress value={customer.usageIndex} tone="brand" className="mt-1.5" />
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[10.5px] tracking-wider text-text-tertiary uppercase">
                  <RiTaskLine className="size-3" aria-hidden /> Tickets
                </p>
                <p className="mt-1 font-display text-[22px] font-bold text-text-primary">{customer.openTickets}</p>
                <p className="text-[10.5px] text-text-tertiary">{customer.criticalTickets} crítico(s)</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[10.5px] tracking-wider text-text-tertiary uppercase">
                  <RiCalendarCheckLine className="size-3" aria-hidden /> NPS
                </p>
                <p className="mt-1 font-display text-[22px] font-bold text-text-primary">{customer.nps ?? "—"}</p>
                <p className="text-[10.5px] text-text-tertiary">
                  {customer.nps == null ? "Não respondido" : customer.nps >= 9 ? "Promotor" : customer.nps >= 7 ? "Neutro" : "Detrator"}
                </p>
              </div>
            </div>
          </SectionCard>
        </TabPanel>
      </Tabs>

      {editOpen ? (
        <CustomerModal
          isOpen={editOpen}
          onOpenChange={setEditOpen}
          customer={customer}
          orgId={data.orgId}
          users={data.users}
        />
      ) : null}
      {contactOpen ? (
        <ContactModal isOpen={contactOpen} onOpenChange={setContactOpen} customer={customer} orgId={data.orgId} />
      ) : null}
      {interactionOpen ? (
        <InteractionModal
          isOpen={interactionOpen}
          onOpenChange={setInteractionOpen}
          customer={customer}
          orgId={data.orgId}
          authorId={currentUser?.id ?? ""}
        />
      ) : null}
      {taskOpen ? (
        <TaskModal
          isOpen={taskOpen}
          onOpenChange={setTaskOpen}
          orgId={data.orgId}
          customers={data.customers}
          users={data.users}
          defaultCustomerId={customer.id}
          defaultAssigneeId={customer.ownerId}
        />
      ) : null}
      {opportunityOpen ? (
        <OpportunityModal
          isOpen={opportunityOpen}
          onOpenChange={setOpportunityOpen}
          orgId={data.orgId}
          customers={data.customers}
          users={data.users}
          defaultCustomerId={customer.id}
        />
      ) : null}
    </div>
  );
}
