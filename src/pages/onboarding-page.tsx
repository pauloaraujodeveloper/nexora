import { useMemo, useState } from "react";
import {
  RiAlertLine,
  RiArrowRightLine,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiPlayCircleLine,
  RiRocketLine,
  RiTimeLine,
  RiUserStarLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Select, SelectItem } from "@/components/base/select/select";
import { PageHeader } from "@/components/nexora/page-header";
import { SectionCard } from "@/components/nexora/section-card";
import { KpiStrip } from "@/components/nexora/kpi-strip";
import { CustomerAvatar, InlineProgress, OwnerChip } from "@/components/nexora/misc";
import { CustomerStatusPill } from "@/components/nexora/status-pill";
import { EmptyState } from "@/components/nexora/empty-state";
import { useApp, useOrgData } from "@/lib/store";
import { buildCustomerHealth } from "@/lib/selectors";
import { formatDate, daysUntil, relativeFuture } from "@/lib/format";
import { useMotionEnabled, useReveal } from "@/lib/motion";
import { navigate } from "@/lib/router";
import { toast } from "@/components/base/toast/toast";
import { cx } from "@/utils/cx";

export function OnboardingPage() {
  const { settings, dispatch } = useApp();
  const data = useOrgData();
  const motion = useMotionEnabled(settings?.reduceMotion);
  const [owner, setOwner] = useState("todos");
  const [onlyLate, setOnlyLate] = useState("todos");

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

  const revealRef = useReveal<HTMLDivElement>(motion, `${owner}-${onlyLate}`);

  const onboarding = health.filter((item) => {
    if (owner !== "todos" && item.customer.ownerId !== owner) return false;
    return true;
  });

  const rows = onboarding
    .map((item) => {
      const steps = data.onboardingSteps
        .filter((step) => step.customerId === item.customer.id)
        .sort((a, b) => a.position - b.position);
      const done = steps.filter((step) => step.status === "concluida").length;
      const current = steps.find((step) => step.status !== "concluida");
      const late = steps.filter((step) => step.status !== "concluida" && +new Date(step.dueDate) < Date.now());
      return { ...item, steps, done, current, late };
    })
    .filter((item) => item.steps.length > 0)
    .filter((item) => (onlyLate === "atrasadas" ? item.late.length > 0 : true))
    .sort((a, b) => b.late.length - a.late.length || a.done / Math.max(1, a.steps.length) - b.done / Math.max(1, b.steps.length));

  const inProgress = rows.filter((item) => item.customer.status === "onboarding");
  const lateSteps = rows.reduce((sum, item) => sum + item.late.length, 0);
  const completed = rows.filter((item) => item.steps.length > 0 && item.done === item.steps.length);
  const avgProgress = rows.length
    ? Math.round(rows.reduce((sum, item) => sum + (item.done / Math.max(1, item.steps.length)) * 100, 0) / rows.length)
    : 0;

  const funnel = settings?.onboardingTemplate.map((step, index) => {
    const reached = rows.filter((item) => {
      const completedNames = new Set(
        item.steps.filter((entry) => entry.status === "concluida").map((entry) => entry.name),
      );
      return settings.onboardingTemplate
        .slice(index)
        .some((templateStep) => completedNames.has(templateStep.name));
    }).length;
    return { name: step.name, days: step.days, index, reached };
  }) ?? [];

  return (
    <div ref={revealRef} className="space-y-4 pt-3">
      <PageHeader
        eyebrow="Implantação"
        title="Onboarding"
        description="Acompanhe cada etapa até o go-live e destrave o que está impedindo a conta de avançar."
        actions={
          <Button size="medium" leadingIcon={RiRocketLine} onClick={() => navigate("clientes")}>
            Ver carteira
          </Button>
        }
      />

      <KpiStrip
        items={[
          {
            label: "Em onboarding",
            value: String(inProgress.length),
            numeric: inProgress.length,
            format: (value) => String(Math.round(value)),
            hint: `${rows.length} contas com trilha ativa`,
            icon: RiPlayCircleLine,
            tone: "cyan",
            animate: motion,
          },
          {
            label: "Etapas atrasadas",
            value: String(lateSteps),
            numeric: lateSteps,
            format: (value) => String(Math.round(value)),
            hint: "Prazo vencido e não concluída",
            icon: RiAlertLine,
            tone: "rose",
            animate: motion,
          },
          {
            label: "Progresso médio",
            value: `${avgProgress}%`,
            numeric: avgProgress,
            format: (value) => `${Math.round(value)}%`,
            hint: "Média das trilhas ativas",
            icon: RiTimeLine,
            tone: "violet",
            animate: motion,
          },
          {
            label: "Concluíram",
            value: String(completed.length),
            numeric: completed.length,
            format: (value) => String(Math.round(value)),
            hint: "Go-live e acompanhamento ok",
            icon: RiCheckboxCircleLine,
            tone: "green",
            animate: motion,
          },
        ]}
      />

      <SectionCard title="Funil de implantação" description="Contas que já passaram por cada etapa">
        <div className="grid gap-2 md:grid-cols-7">
          {funnel.map((step, index) => {
            const percent = rows.length ? (step.reached / rows.length) * 100 : 0;
            const isLast = index === funnel.length - 1;
            return (
              <div key={step.name} className="relative">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="grid size-5 place-items-center rounded bg-white/[0.06] text-[9px] font-bold text-text-tertiary">
                      {index + 1}
                    </span>
                    <span className="font-display text-[16px] font-bold text-text-primary tabular-nums">
                      {step.reached}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-snug text-text-secondary">{step.name}</p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={cx("h-full rounded-full", isLast ? "bg-emerald-400" : "brand-gradient-bar")}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
                {!isLast ? (
                  <RiArrowRightLine className="absolute top-1/2 -right-2 z-10 hidden size-3 -translate-y-1/2 text-text-disabled md:block" aria-hidden />
                ) : null}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Trilhas em andamento"
        description="Ordenadas por atraso e progresso"
        action={
          <div className="flex items-center gap-2">
            <Select aria-label="Responsável" size="sm" selectedKey={owner} onSelectionChange={(key) => setOwner(String(key))} className="w-[170px]">
              <SelectItem id="todos">Todos os CSMs</SelectItem>
              {data.users.map((user) => (
                <SelectItem key={user.id} id={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </Select>
            <Select aria-label="Situação" size="sm" selectedKey={onlyLate} onSelectionChange={(key) => setOnlyLate(String(key))} className="w-[150px]">
              <SelectItem id="todos">Todas</SelectItem>
              <SelectItem id="atrasadas">Com atraso</SelectItem>
            </Select>
          </div>
        }
        padded={false}
      >
        {rows.length ? (
          <ul className="divide-y divide-white/[0.05]">
            {rows.map((item) => {
              const percent = (item.done / Math.max(1, item.steps.length)) * 100;
              return (
                <li key={item.customer.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <CustomerAvatar customer={item.customer} size={36} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`clientes/${item.customer.id}?tab=onboarding`)}
                          className="truncate text-[12.5px] font-semibold text-text-primary hover:text-accent-200"
                        >
                          {item.customer.tradeName}
                        </button>
                        <CustomerStatusPill status={item.customer.status} />
                      </div>
                      <p className="truncate text-[10.5px] text-text-tertiary">
                        Etapa atual: {item.current?.name ?? "Concluída"}
                        {item.current ? ` · ${relativeFuture(item.current.dueDate)}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="w-full max-w-[260px]">
                    <div className="mb-1 flex items-center justify-between text-[10.5px]">
                      <span className="text-text-tertiary">
                        {item.done}/{item.steps.length} etapas
                      </span>
                      <span className="font-semibold text-text-primary">{Math.round(percent)}%</span>
                    </div>
                    <InlineProgress value={percent} tone={item.late.length > 0 ? "amber" : percent === 100 ? "green" : "brand"} />
                  </div>

                  <div className="flex items-center gap-2">
                    <OwnerChip user={item.owner} compact />
                    <span className="hidden w-[86px] text-[10.5px] text-text-tertiary sm:block">
                      {item.current ? formatDate(item.current.dueDate) : "—"}
                    </span>
                    {item.late.length > 0 ? (
                      <span className="nx-status-pill nx-status-attention px-2 py-0.5 text-[10px]">
                        <RiAlertLine className="size-3" aria-hidden /> {item.late.length} atraso(s)
                      </span>
                    ) : null}
                    {item.current ? (
                      <Button
                        variant="secondary"
                        size="xs"
                        leadingIcon={RiCheckLine}
                        onClick={() => {
                          dispatch({
                            type: "updateStep",
                            id: item.current!.id,
                            patch: { status: "concluida", completedAt: new Date().toISOString() },
                          });
                          toast.success("Etapa concluída", {
                            description: `${item.current!.name} · ${item.customer.tradeName}`,
                          });
                        }}
                      >
                        Concluir etapa
                      </Button>
                    ) : (
                      <span className="nx-status-pill nx-status-healthy px-2 py-0.5 text-[10px]">
                        <RiUserStarLine className="size-3" aria-hidden /> Go-live
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={RiRocketLine}
            title="Nenhuma trilha encontrada"
            description="Ajuste os filtros ou cadastre uma nova conta para iniciar o onboarding."
          />
        )}
      </SectionCard>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10.5px] text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <RiTimeLine className="size-3.5 text-brand-cyan" aria-hidden />
          {daysUntil(new Date(Date.now() + 30 * 86_400_000).toISOString())} dias no horizonte de acompanhamento
        </span>
        <span>Modelo com {settings?.onboardingTemplate.length ?? 0} etapas</span>
        <span className="ml-auto">As etapas concluídas recalculam o health score automaticamente.</span>
      </div>
    </div>
  );
}
