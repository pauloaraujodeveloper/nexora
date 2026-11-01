import { useMemo, useState } from "react";
import {
  RiAlertLine,
  RiArrowRightLine,
  RiCalendarCheckLine,
  RiCheckLine,
  RiDownloadLine,
  RiGroupLine,
  RiHeartPulseLine,
  RiLineChartLine,
  RiMoneyDollarCircleLine,
  RiRefreshLine,
  RiTimeLine,
  RiUserHeartLine,
} from "@remixicon/react";
import type { ChartOptions } from "chart.js";
import { Button } from "@/components/base/buttons/button";
import { Select, SelectItem } from "@/components/base/select/select";
import { SegmentedControl, SegmentedControlItem } from "@/components/base/segmented-control/segmented-control";
import { toast } from "@/components/base/toast/toast";
import { PageHeader } from "@/components/nexora/page-header";
import { SectionCard } from "@/components/nexora/section-card";
import { KpiStrip } from "@/components/nexora/kpi-strip";
import { FilterBar } from "@/components/nexora/filter-bar";
import { MiniBar } from "@/components/nexora/mini-bar";
import { ChartCanvas } from "@/components/nexora/chart-canvas";
import { HealthRing } from "@/components/nexora/health-ring";
import { HealthBandPill, PriorityPill } from "@/components/nexora/status-pill";
import { CustomerAvatar, InlineProgress, OwnerChip } from "@/components/nexora/misc";
import { EmptyState } from "@/components/nexora/empty-state";
import { useApp, useOrgData } from "@/lib/store";
import {
  buildCustomerHealth,
  contactHeatmap,
  dashboardData,
} from "@/lib/selectors";
import { areaGradient, chartPalette } from "@/lib/chart";
import {
  compactCurrency,
  formatCurrency,
  formatDate,
  formatShortDate,
  daysUntil,
  relativeTime,
} from "@/lib/format";
import { useMotionEnabled, useReveal } from "@/lib/motion";
import type { DashboardPeriod } from "@/lib/types";
import { navigate } from "@/lib/router";
import { cx } from "@/utils/cx";

const PERIODS: { id: DashboardPeriod; label: string }[] = [
  { id: 30, label: "30 d" },
  { id: 90, label: "90 d" },
  { id: 180, label: "6 m" },
  { id: 365, label: "12 m" },
];

export function DashboardPage() {
  const { settings, currentUser, dispatch } = useApp();
  const data = useOrgData();
  const [period, setPeriod] = useState<DashboardPeriod>(90);
  const [owner, setOwner] = useState("todos");
  const [segment, setSegment] = useState("todos");
  const [plan, setPlan] = useState("todos");
  const motion = useMotionEnabled(settings?.reduceMotion);

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

  const dashboard = useMemo(() => {
    if (!settings) return null;
    return dashboardData(
      health,
      data.interactions,
      data.onboardingSteps,
      data.opportunities,
      data.tasks,
      {
        period,
        owner: owner === "todos" ? "" : owner,
        segment: segment === "todos" ? "" : segment,
        plan: plan === "todos" ? "" : plan,
      },
      settings,
    );
  }, [health, data, settings, period, owner, segment, plan]);

  const revealRef = useReveal<HTMLDivElement>(motion, `${owner}-${segment}-${plan}-${period}`);

  const healthTrend = useMemo(() => {
    let now = 0;
    let before = 0;
    let count = 0;
    const cutoff = Date.now() - 90 * 86_400_000;
    for (const item of health) {
      const history = data.scores
        .filter((score) => score.customerId === item.customer.id)
        .sort((a, b) => +new Date(a.calculatedAt) - +new Date(b.calculatedAt));
      if (history.length < 2) continue;
      const latest = history[history.length - 1];
      const past = [...history].reverse().find((score) => +new Date(score.calculatedAt) <= cutoff) ?? history[0];
      now += latest.score;
      before += past.score;
      count += 1;
    }
    return count ? now / count - before / count : 0;
  }, [health, data.scores]);

  const owners = data.users.filter((user) => ["csm", "gestor", "comercial", "admin"].includes(user.role));
  const segments = [...new Set(data.customers.map((customer) => customer.segment))].sort();
  const plans = [...new Set(data.customers.map((customer) => customer.plan))].sort();

  if (!dashboard || !settings) return null;

  const evolution = dashboard.evolution.slice(
    period === 30 ? -2 : period === 90 ? -4 : period === 180 ? -7 : -12,
  );
  const previous = evolution[evolution.length - 2];
  const current = evolution[evolution.length - 1];
  const mrrDelta = previous?.mrr ? ((current.mrr - previous.mrr) / previous.mrr) * 100 : 0;
  const activeDelta = previous ? current.active - previous.active : 0;
  const activeDeltaPct = previous?.active ? (activeDelta / previous.active) * 100 : 0;
  const riskShare = dashboard.scoped.length
    ? (dashboard.atRisk.length / dashboard.scoped.length) * 100
    : 0;

  const spark = evolution.map((item) => item.mrr);

  const mrrOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y ?? 0;
            return context.dataset.yAxisID === "y1"
              ? `${context.dataset.label}: ${value}`
              : `${context.dataset.label}: ${compactCurrency(value * 1000)}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0 } },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: "rgba(126,148,196,0.09)" },
        ticks: {
          callback: (value) => `${Number(value)}k`,
          maxTicksLimit: 5,
        },
      },
      y1: {
        position: "right",
        beginAtZero: true,
        border: { display: false },
        grid: { display: false },
        ticks: { maxTicksLimit: 4, precision: 0 },
      },
    },
  };

  const mrrData = {
    labels: evolution.map((item) => item.label),
    datasets: [
      {
        type: "line" as const,
        label: "MRR",
        data: evolution.map((item) => Math.round(item.mrr / 1000)),
        borderColor: chartPalette.cyan,
        backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) =>
          areaGradient(context.chart.ctx, chartPalette.cyan, 260),
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: chartPalette.cyan,
        pointHoverBorderColor: "#071019",
        pointHoverBorderWidth: 2,
        yAxisID: "y",
      },
      {
        type: "line" as const,
        label: "Em risco",
        data: evolution.map((item) => item.risk),
        borderColor: chartPalette.rose,
        backgroundColor: "transparent",
        borderWidth: 1.6,
        borderDash: [4, 4],
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 4,
        yAxisID: "y1",
      },
    ],
  };

  const statusData = {
    labels: dashboard.statusDistribution.map((item) => item.label),
    datasets: [
      {
        data: dashboard.statusDistribution.map((item) => item.value),
        backgroundColor: dashboard.statusDistribution.map((item) => item.color),
        borderColor: "rgba(8,13,24,0.9)",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const statusOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: { tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed}` } } },
  };

  const segmentData = {
    labels: dashboard.healthBySegment.map((item) => item.segment),
    datasets: [
      {
        label: "Health médio",
        data: dashboard.healthBySegment.map((item) => item.score),
        backgroundColor: dashboard.healthBySegment.map((item) =>
          item.score >= settings.healthyThreshold
            ? chartPalette.green
            : item.score >= settings.attentionThreshold
              ? chartPalette.amber
              : chartPalette.rose,
        ),
        borderRadius: 6,
        barThickness: 14,
      },
    ],
  };

  const segmentOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: { tooltip: { callbacks: { label: (context) => `Score ${context.parsed.x}` } } },
    scales: {
      x: { min: 0, max: 100, grid: { color: "rgba(126,148,196,0.09)" }, border: { display: false } },
      y: { grid: { display: false }, border: { display: false } },
    },
  };

  const heatmap = contactHeatmap(health, data.interactions, 10, 8);
  const maxHeat = Math.max(1, ...heatmap.rows.flatMap((row) => row.values));
  const nextRenewals = dashboard.renewals.slice(0, 5);
  const topRisks = dashboard.topRisk.slice(0, 5);
  const openTasks = dashboard.openTasks.slice(0, 5);
  const activity = dashboard.recentActivity.slice(0, 6);

  function recalculate() {
    dispatch({ type: "recalculate", orgId: data.orgId });
    toast.success("Health scores recalculados", {
      description: `${data.customers.length} contas atualizadas com as regras atuais.`,
    });
  }

  return (
    <div ref={revealRef} className="space-y-4 pt-3">
      <PageHeader
        eyebrow="Visão executiva"
        title={`Olá, ${currentUser?.name.split(" ")[0] ?? "time"}.`}
        description="A saúde da sua carteira em uma leitura só: receita, risco, onboarding e o que precisa de ação hoje."
        actions={
          <>
            <Button variant="secondary" size="medium" leadingIcon={RiDownloadLine} onClick={() => toast.info("Relatório preparado", { description: "Exportação de demonstração gerada em memória." })}>
              Exportar
            </Button>
            <Button size="medium" leadingIcon={RiRefreshLine} onClick={recalculate}>
              Recalcular scores
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------------ filters */}
      <FilterBar
        primary={
          <SegmentedControl
            aria-label="Período"
            selectedKeys={[String(period)]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (key != null) setPeriod(Number(key) as DashboardPeriod);
            }}
            variant="plain"
            className="shrink-0"
          >
            {PERIODS.map((item) => (
              <SegmentedControlItem key={item.id} id={String(item.id)}>
                {item.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        }
        activeCount={
          Number(owner !== "todos") + Number(segment !== "todos") + Number(plan !== "todos")
        }
        onClear={() => {
          setOwner("todos");
          setSegment("todos");
          setPlan("todos");
        }}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select
            aria-label="Responsável"
            size="sm"
            selectedKey={owner}
            onSelectionChange={(key) => setOwner(String(key ?? "todos"))}
            className="min-w-0"
          >
            <SelectItem id="todos">Todos os responsáveis</SelectItem>
            {owners.map((user) => (
              <SelectItem key={user.id} id={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Segmento"
            size="sm"
            selectedKey={segment}
            onSelectionChange={(key) => setSegment(String(key ?? "todos"))}
            className="min-w-0"
          >
            <SelectItem id="todos">Todos os segmentos</SelectItem>
            {segments.map((item) => (
              <SelectItem key={item} id={item}>
                {item}
              </SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Plano"
            size="sm"
            selectedKey={plan}
            onSelectionChange={(key) => setPlan(String(key ?? "todos"))}
            className="min-w-0"
          >
            <SelectItem id="todos">Todos os planos</SelectItem>
            {plans.map((item) => (
              <SelectItem key={item} id={item}>
                {item}
              </SelectItem>
            ))}
          </Select>
        </div>
      </FilterBar>

      {/* ---------------------------------------------------------------- kpi */}
      <KpiStrip
        items={[
          {
            label: "MRR ativo",
            value: formatCurrency(dashboard.mrrTotal),
            numeric: dashboard.mrrTotal,
            format: (value) => formatCurrency(value),
            delta: mrrDelta,
            icon: RiMoneyDollarCircleLine,
            tone: "cyan",
            spark,
            animate: motion,
          },
          {
            label: "Contas ativas",
            value: String(dashboard.counts.active),
            numeric: dashboard.counts.active,
            format: (value) => String(Math.round(value)),
            delta: activeDeltaPct,
            deltaLabel: "no período",
            icon: RiGroupLine,
            tone: "green",
            animate: motion,
          },
          {
            label: "Health médio",
            value: String(dashboard.avgHealth),
            numeric: dashboard.avgHealth,
            format: (value) => String(Math.round(value)),
            delta: healthTrend,
            deltaLabel: "vs. 90 dias",
            icon: RiHeartPulseLine,
            tone: "violet",
            animate: motion,
          },
          {
            label: "Receita em risco",
            value: formatCurrency(dashboard.mrrAtRisk),
            numeric: dashboard.mrrAtRisk,
            format: (value) => formatCurrency(value),
            hint: `${dashboard.counts.risk} contas · ${riskShare.toFixed(0)}% da carteira`,
            icon: RiAlertLine,
            tone: "rose",
            animate: motion,
          },
        ]}
      />

      {/* ------------------------------------------------------------- charts */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.65fr_1fr]">
        <SectionCard
          title="Receita e risco ao longo do tempo"
          description="MRR em milhares de reais e contas em risco por mês"
          action={
            <span className="nx-chart-legend">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
                <span className="nx-legend-swatch bg-brand-cyan" /> MRR
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
                <span className="nx-legend-swatch bg-rose-400" /> Em risco
              </span>
            </span>
          }
        >
          <ChartCanvas
            type="line"
            data={mrrData}
            options={mrrOptions}
            height={268}
            ariaLabel="Evolução mensal de MRR e contas em risco"
          />
        </SectionCard>

        <SectionCard title="Distribuição da carteira" description="Status das contas filtradas">
          <div className="relative">
            <ChartCanvas
              type="doughnut"
              data={statusData}
              options={statusOptions}
              height={176}
              ariaLabel="Distribuição de clientes por status"
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[24px] leading-none font-bold text-text-primary">
                {dashboard.scoped.length}
              </span>
              <span className="mt-1 text-[10px] tracking-[0.1em] text-text-tertiary uppercase">contas</span>
            </div>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-1.5">
            {dashboard.statusDistribution.map((item) => (
              <li key={item.key} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2 py-1.5">
                <span className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <span className="size-2 rounded-full" style={{ background: item.color }} />
                  {item.label}
                </span>
                <span className="text-[12px] font-semibold text-text-primary tabular-nums">{item.value}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <SectionCard title="Health por segmento" description="Média ponderada das contas ativas">
          {dashboard.healthBySegment.length ? (
            <ChartCanvas
              type="bar"
              data={segmentData}
              options={segmentOptions}
              height={220}
              ariaLabel="Health score médio por segmento"
            />
          ) : (
            <EmptyState compact title="Sem segmentos" description="Ajuste os filtros para ver dados." />
          )}
        </SectionCard>

        <SectionCard title="Funil de onboarding" description="Onde as implantações estão paradas">
          <ul className="space-y-2.5">
            {dashboard.onboardingFunnel.map((step, index) => {
              const total = Math.max(1, dashboard.onboarding.length);
              const percent = (step.value / total) * 100;
              return (
                <li key={step.label}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="flex min-w-0 items-center gap-1.5 text-text-secondary">
                      <span className="grid size-4 shrink-0 place-items-center rounded bg-white/[0.06] text-[9px] font-semibold text-text-tertiary">
                        {index + 1}
                      </span>
                      <span className="truncate">{step.label}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-text-primary tabular-nums">{step.value}</span>
                  </div>
                  <InlineProgress value={percent} tone={index >= 5 ? "green" : "brand"} />
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11.5px] text-emerald-200">
              <RiCheckLine className="size-3.5" aria-hidden />
              Concluíram o onboarding
            </span>
            <span className="font-display text-[16px] font-bold text-emerald-200">
              {dashboard.onboardingCompleted}
            </span>
          </div>
        </SectionCard>

        <SectionCard title="Motivos de churn" description="Cancelamentos no período filtrado">
          {dashboard.cancelReasons.some((item) => item.value > 0) ? (
            <ul className="space-y-3">
              {dashboard.cancelReasons
                .filter((item) => item.value > 0)
                .sort((a, b) => b.value - a.value)
                .map((item) => {
                  const total = dashboard.cancelReasons.reduce((sum, entry) => sum + entry.value, 0) || 1;
                  return (
                    <li key={item.key}>
                      <div className="mb-1 flex items-center justify-between text-[11.5px]">
                        <span className="text-text-secondary">{item.label}</span>
                        <span className="font-semibold text-text-primary">
                          {item.value} · {Math.round((item.value / total) * 100)}%
                        </span>
                      </div>
                      <MiniBar value={(item.value / total) * 100} />
                    </li>
                  );
                })}
            </ul>
          ) : (
            <EmptyState compact title="Nenhum churn no período" description="Boa notícia: nenhuma conta cancelada neste recorte." />
          )}
          <button
            type="button"
            onClick={() => navigate("auditoria")}
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/[0.07] px-3 py-2 text-[11.5px] text-text-secondary transition-colors hover:border-white/15 hover:text-text-primary"
          >
            Ver trilha de auditoria
            <RiArrowRightLine className="size-3.5" aria-hidden />
          </button>
        </SectionCard>
      </div>

      {/* -------------------------------------------------------------- lists */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="Contas que pedem atenção"
          description="Maior receita com saúde em risco"
          action={
            <Button variant="ghost" size="small" trailingIcon={RiArrowRightLine} onClick={() => navigate("clientes?band=risco")}>
              Ver carteira
            </Button>
          }
          padded={false}
        >
          {topRisks.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {topRisks.map((item) => (
                <li key={item.customer.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`clientes/${item.customer.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04] sm:px-5"
                  >
                    <CustomerAvatar customer={item.customer} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[12.5px] font-semibold text-text-primary">
                          {item.customer.tradeName}
                        </span>
                        <HealthBandPill band={item.health.band} />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-text-tertiary">
                        {item.health.topFactors[0] ?? "Score em queda"}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-[12px] font-semibold text-text-primary tabular-nums">
                        {formatCurrency(item.customer.mrr)}
                      </p>
                      <p className="text-[10px] text-text-tertiary">MRR</p>
                    </div>
                    <HealthRing score={item.health.score} band={item.health.band} size={44} stroke={4} animated={motion} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="Nenhuma conta em risco" description="A carteira está saudável neste recorte." />
          )}
        </SectionCard>

        <SectionCard title="Próximos passos" description="Tarefas abertas por prazo" padded={false}>
          {openTasks.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {openTasks.map((task) => {
                const late = daysUntil(task.dueDate) < 0;
                return (
                  <li key={task.id} className="flex items-start gap-2.5 px-4 py-2.5 sm:px-5">
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({ type: "updateTask", id: task.id, patch: { status: "concluida" } });
                        toast.success("Tarefa concluída");
                      }}
                      className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-white/20 text-transparent transition-colors hover:border-emerald-400 hover:text-emerald-300"
                      aria-label={`Concluir ${task.title}`}
                    >
                      <RiCheckLine className="size-3" aria-hidden />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] leading-snug font-medium text-text-primary">{task.title}</p>
                      <p className={cx("mt-0.5 flex items-center gap-1 text-[10.5px]", late ? "text-rose-300" : "text-text-tertiary")}>
                        <RiTimeLine className="size-3" aria-hidden />
                        {formatShortDate(task.dueDate)} · {late ? "atrasada" : "no prazo"}
                      </p>
                    </div>
                    <PriorityPill priority={task.priority} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact title="Sem tarefas abertas" description="Tudo em dia por aqui." />
          )}
          <div className="border-t border-white/[0.06] p-3">
            <Button variant="secondary" size="small" className="w-full" onClick={() => navigate("tarefas")}>
              Abrir central de tarefas
            </Button>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          title="Renovações nos próximos 90 dias"
          description={`${dashboard.counts.renewals} contratos · ${compactCurrency(dashboard.renewalValue)} em ARR`}
          padded={false}
        >
          {nextRenewals.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {nextRenewals.map((item) => {
                const days = daysUntil(item.customer.renewalDate);
                return (
                  <li key={item.customer.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`clientes/${item.customer.id}?tab=resumo`)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04] sm:px-5"
                    >
                      <span className={cx(
                        "grid size-9 shrink-0 place-items-center rounded-xl ring-1",
                        days <= 30 ? "bg-amber-400/10 text-amber-300 ring-amber-400/20" : "bg-white/[0.05] text-text-secondary ring-white/10",
                      )}>
                        <RiCalendarCheckLine className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-semibold text-text-primary">{item.customer.tradeName}</p>
                        <p className="mt-0.5 text-[10.5px] text-text-tertiary">
                          {formatDate(item.customer.renewalDate)} · {days} dias
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-semibold text-text-primary tabular-nums">{formatCurrency(item.customer.mrr)}</p>
                        <p className="text-[10px] text-text-tertiary">MRR</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact title="Nenhuma renovação próxima" description="Sem contratos vencendo em 90 dias." />
          )}
        </SectionCard>

        <SectionCard title="Atividade recente" description="Últimas interações registradas" padded={false}>
          {activity.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {activity.map((item) => {
                const customer = data.customers.find((entry) => entry.id === item.customerId);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`clientes/${item.customerId}?tab=interacoes`)}
                      className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04] sm:px-5"
                    >
                      <span className={cx(
                        "mt-0.5 size-2 shrink-0 rounded-full",
                        item.sentiment === "positivo" ? "bg-emerald-400" : item.sentiment === "negativo" ? "bg-rose-400" : "bg-slate-400",
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-text-primary">
                          {customer?.tradeName ?? "Cliente"} · {item.subject}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-text-tertiary">
                          {relativeTime(item.occurredAt)} · {item.type}
                        </p>
                      </div>
                      <RiArrowRightLine className="mt-1 size-3.5 shrink-0 text-text-disabled" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact title="Sem atividade" description="Registre uma interação para começar." />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Mapa de contatos"
        description="Interações por semana nas 8 maiores contas"
        action={
          <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
            menos
            <span className="mx-1 flex gap-0.5">
              {[0.1, 0.25, 0.45, 0.7, 1].map((opacity) => (
                <span key={opacity} className="size-2.5 rounded-sm bg-brand-cyan" style={{ opacity }} />
              ))}
            </span>
            mais
          </span>
        }
      >
        <div className="nx-scroll overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-y-1">
            <thead>
              <tr>
                <th className="w-[150px] pb-1 text-left text-[10px] font-semibold tracking-wider text-text-tertiary uppercase">
                  Conta
                </th>
                {heatmap.weeks.map((week) => (
                  <th key={week.toISOString()} className="pb-1 text-center text-[9px] font-medium text-text-tertiary">
                    {formatShortDate(week)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.rows.map((row) => (
                <tr key={row.customer.id}>
                  <td className="pr-2">
                    <span className="flex items-center gap-2">
                      <CustomerAvatar customer={row.customer} size={22} />
                      <span className="truncate text-[11.5px] text-text-secondary">{row.customer.tradeName}</span>
                    </span>
                  </td>
                  {row.values.map((value, index) => (
                    <td key={index} className="p-0.5">
                      <div
                        className="mx-auto h-6 w-full min-w-6 rounded-md border border-white/[0.04] transition-transform hover:scale-105"
                        style={{
                          background:
                            value === 0
                              ? "rgba(126,148,196,0.06)"
                              : `rgba(34, 211, 238, ${0.18 + (value / maxHeat) * 0.72})`,
                        }}
                        title={`${row.customer.tradeName}: ${value} interação(ões)`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10.5px] text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <RiLineChartLine className="size-3.5 text-brand-cyan" aria-hidden />
          {data.interactions.length} interações no histórico
        </span>
        <span className="flex items-center gap-1.5">
          <RiUserHeartLine className="size-3.5 text-brand-violet" aria-hidden />
          {owners.length} responsáveis ativos
        </span>
        <span className="flex items-center gap-1.5">
          <RiTimeLine className="size-3.5 text-brand-magenta" aria-hidden />
          Atualizado {relativeTime(new Date())}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <OwnerChip user={owners[0]} compact />
          <span>e mais {Math.max(0, owners.length - 1)}</span>
        </span>
      </div>
    </div>
  );
}
