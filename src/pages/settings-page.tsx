import { useEffect, useMemo, useState } from "react";
import {
  RiAddLine,
  RiAlertLine,
  RiDeleteBin6Line,
  RiDragMove2Line,
  RiEqualizerLine,
  RiErrorWarningLine,
  RiRefreshLine,
  RiRobot2Line,
  RiSave3Line,
  RiSettings3Line,
  RiShieldCheckLine,
  RiSparklingLine,
  RiTimeLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { Slider } from "@/components/base/slider/slider";
import { Switch } from "@/components/base/switch/switch";
import { AlertDialog } from "@/components/base/modal/modal";
import { toast } from "@/components/base/toast/toast";
import { PageHeader } from "@/components/nexora/page-header";
import { SectionCard } from "@/components/nexora/section-card";
import { useApp, useOrgData } from "@/lib/store";
import { useMotionEnabled, useReveal } from "@/lib/motion";
import { roleLabel } from "@/lib/format";
import type { OnboardingTemplateStep, OrgSettings, Role, ScoreWeights } from "@/lib/types";
import { cx } from "@/utils/cx";

const WEIGHT_META: { key: keyof ScoreWeights; label: string; description: string; color: string }[] = [
  {
    key: "contact",
    label: "Frequência de contato",
    description: "Dias desde a última interação registrada.",
    color: "from-cyan-400 to-blue-500",
  },
  {
    key: "onboarding",
    label: "Onboarding",
    description: "Etapas concluídas e atrasos na implantação.",
    color: "from-violet-400 to-fuchsia-500",
  },
  {
    key: "usage",
    label: "Uso do produto",
    description: "Índice de adoção e profundidade de uso.",
    color: "from-emerald-400 to-teal-500",
  },
  {
    key: "support",
    label: "Suporte",
    description: "Tickets abertos e criticidade dos chamados.",
    color: "from-amber-400 to-orange-500",
  },
  {
    key: "finance",
    label: "Financeiro",
    description: "Situação de pagamento e histórico de atraso.",
    color: "from-sky-400 to-indigo-500",
  },
  {
    key: "sentiment",
    label: "Sentimento",
    description: "Tom das últimas interações e NPS.",
    color: "from-rose-400 to-pink-500",
  },
];

const ALERT_META: { key: keyof OrgSettings["alerts"]; label: string; description: string }[] = [
  {
    key: "noContact",
    label: "Conta sem contato",
    description: "Alertar quando o cliente ultrapassar o limite de dias sem contato.",
  },
  {
    key: "onboardingLate",
    label: "Etapa de onboarding atrasada",
    description: "Sinalizar etapas com prazo vencido e não concluídas.",
  },
  {
    key: "scoreDrop",
    label: "Queda de health score",
    description: "Avisar quando o score cair de faixa entre recálculos.",
  },
  {
    key: "renewal",
    label: "Renovação próxima",
    description: "Criar alerta para contratos vencendo nos próximos 45 dias.",
  },
  {
    key: "criticalRisk",
    label: "Risco crítico aberto",
    description: "Priorizar contas com risco de severidade crítica ou alta.",
  },
];

const ROLES: Role[] = ["csm", "gestor", "comercial", "admin", "leitura"];

export function SettingsPage() {
  const { settings, dispatch, currentUser, currentOrg, resetDemo } = useApp();
  const data = useOrgData();
  const motion = useMotionEnabled(settings?.reduceMotion);
  const revealRef = useReveal<HTMLDivElement>(motion, data.orgId);

  const [weights, setWeights] = useState<ScoreWeights>(
    settings?.scoreWeights ?? { contact: 25, onboarding: 20, usage: 20, support: 15, finance: 10, sentiment: 10 },
  );
  const [healthy, setHealthy] = useState(settings?.healthyThreshold ?? 80);
  const [attention, setAttention] = useState(settings?.attentionThreshold ?? 50);
  const [contactLimit, setContactLimit] = useState(String(settings?.contactLimitDays ?? 30));
  const [template, setTemplate] = useState<OnboardingTemplateStep[]>(settings?.onboardingTemplate ?? []);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setWeights(settings.scoreWeights);
    setHealthy(settings.healthyThreshold);
    setAttention(settings.attentionThreshold);
    setContactLimit(String(settings.contactLimitDays));
    setTemplate(settings.onboardingTemplate);
  }, [settings, data.orgId]);

  const weightTotal = useMemo(
    () => Object.values(weights).reduce((sum, value) => sum + value, 0),
    [weights],
  );

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin" || currentUser?.role === "gestor";

  function patchSettings(patch: Partial<OrgSettings>) {
    if (!settings) return;
    dispatch({ type: "updateSettings", orgId: data.orgId, patch });
  }

  function saveWeights() {
    if (weightTotal !== 100) {
      toast.error("Os pesos precisam somar 100%", {
        description: `A soma atual é ${weightTotal}%. Ajuste antes de salvar.`,
      });
      return;
    }
    if (attention >= healthy) {
      toast.error("Limiares inválidos", {
        description: "O limite de atenção deve ser menor que o de conta saudável.",
      });
      return;
    }
    patchSettings({
      scoreWeights: weights,
      healthyThreshold: healthy,
      attentionThreshold: attention,
      contactLimitDays: Math.max(1, Number(contactLimit) || 30),
    });
    dispatch({ type: "recalculate", orgId: data.orgId });
    toast.success("Regras de score atualizadas", {
      description: "Todos os health scores foram recalculados com os novos pesos.",
    });
  }

  function normalizeWeights() {
    const total = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
    const keys = Object.keys(weights) as (keyof ScoreWeights)[];
    const next = { ...weights };
    let running = 0;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        next[key] = Math.max(0, 100 - running);
      } else {
        next[key] = Math.round((weights[key] / total) * 100);
        running += next[key];
      }
    });
    setWeights(next);
    toast.info("Pesos normalizados para 100%");
  }

  function saveTemplate() {
    if (template.length === 0) {
      toast.error("O modelo precisa de ao menos uma etapa");
      return;
    }
    patchSettings({ onboardingTemplate: template });
    toast.success("Modelo de onboarding salvo", {
      description: `${template.length} etapas configuradas para novas contas.`,
    });
  }

  function updateStep(index: number, patch: Partial<OnboardingTemplateStep>) {
    setTemplate((current) =>
      current.map((step, position) => (position === index ? { ...step, ...patch } : step)),
    );
  }

  if (!settings) return null;

  return (
    <div ref={revealRef} className="space-y-4 pt-3">
      <PageHeader
        eyebrow="Administração"
        title="Configurações"
        description={`Regras da organização ${currentOrg?.name ?? ""}: como o health score é calculado, quando alertar e como o onboarding começa.`}
        actions={
          <Button
            size="medium"
            leadingIcon={RiSave3Line}
            onClick={saveWeights}
            disabled={!isAdmin}
          >
            Salvar regras
          </Button>
        }
      />

      {!isAdmin ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-[11.5px] text-amber-200">
          <RiShieldCheckLine className="mt-0.5 size-4 shrink-0" aria-hidden />
          Seu perfil ({currentUser ? roleLabel[currentUser.role] : "—"}) tem acesso somente leitura a estas
          configurações. Alterações exigem perfil de gestor ou administrador.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_1fr]">
        {/* ------------------------------------------------------------ weights */}
        <SectionCard
          title="Pesos do health score"
          description="Cada dimensão entra no cálculo de 0 a 100 pontos, ponderada pelo peso abaixo."
          action={
            <Button variant="ghost" size="xs" leadingIcon={RiEqualizerLine} onClick={normalizeWeights} disabled={!isAdmin}>
              Normalizar 100%
            </Button>
          }
        >
          <div className="space-y-4">
            {WEIGHT_META.map((meta) => {
              const value = weights[meta.key];
              return (
                <div key={meta.key}>
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-text-primary">{meta.label}</p>
                      <p className="text-[10.5px] text-text-tertiary">{meta.description}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[11px] font-semibold text-text-primary tabular-nums">
                      {value}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={value}
                    disabled={!isAdmin}
                    onChange={(event) =>
                      setWeights((current) => ({ ...current, [meta.key]: Number(event.target.value) }))
                    }
                    aria-label={`Peso de ${meta.label}`}
                    className="nx-range w-full"
                  />
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={cx("h-full rounded-full bg-gradient-to-r", meta.color)}
                      style={{ width: `${(value / 50) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={cx(
              "mt-4 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5",
              weightTotal === 100
                ? "border-emerald-400/20 bg-emerald-400/[0.06]"
                : "border-rose-400/25 bg-rose-400/[0.07]",
            )}
          >
            <span className="flex items-center gap-1.5 text-[11.5px] text-text-secondary">
              {weightTotal === 100 ? (
                <RiShieldCheckLine className="size-3.5 text-emerald-300" aria-hidden />
              ) : (
                <RiErrorWarningLine className="size-3.5 text-rose-300" aria-hidden />
              )}
              Soma dos pesos
            </span>
            <span
              className={cx(
                "font-display text-[16px] font-bold tabular-nums",
                weightTotal === 100 ? "text-emerald-300" : "text-rose-300",
              )}
            >
              {weightTotal}%
            </span>
          </div>
        </SectionCard>

        <div className="space-y-3">
          {/* -------------------------------------------------------- thresholds */}
          <SectionCard title="Limiares de saúde" description="Faixas usadas em toda a plataforma">
            <div className="space-y-4">
              <Slider
                label="Conta saudável a partir de"
                thumbLabel="Limite saudável"
                minValue={50}
                maxValue={100}
                step={1}
                value={healthy}
                onChange={(value) => setHealthy(Number(value))}
                isDisabled={!isAdmin}
                formatValue={(value) => `${value} pts`}
              />
              <Slider
                label="Atenção a partir de"
                thumbLabel="Limite de atenção"
                minValue={0}
                maxValue={90}
                step={1}
                value={attention}
                onChange={(value) => setAttention(Number(value))}
                isDisabled={!isAdmin}
                formatValue={(value) => `${value} pts`}
              />
            </div>

            <div className="mt-4 space-y-1.5">
              {[
                { label: "Saudável", range: `${healthy}–100`, tone: "bg-emerald-400" },
                { label: "Atenção", range: `${attention}–${healthy - 1}`, tone: "bg-amber-400" },
                { label: "Risco", range: `0–${attention - 1}`, tone: "bg-rose-400" },
              ].map((band) => (
                <div key={band.label} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                  <span className={cx("size-2 rounded-full", band.tone)} />
                  <span className="flex-1 text-[11.5px] text-text-secondary">{band.label}</span>
                  <span className="text-[11px] font-semibold text-text-primary tabular-nums">{band.range}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ------------------------------------------------------------ cadence */}
          <SectionCard title="Cadência de relacionamento" description="Régua usada nos alertas de contato">
            <Input
              label="Limite de dias sem contato"
              type="number"
              value={contactLimit}
              onChange={setContactLimit}
              isDisabled={!isAdmin}
              hint="Contas acima deste limite entram na central de alertas."
            />
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 text-[10.5px] text-text-tertiary">
              <RiTimeLine className="mt-0.5 size-3.5 shrink-0 text-brand-cyan" aria-hidden />
              Atualmente {data.customers.filter((customer) => {
                const last = customer.lastContactAt ? +new Date(customer.lastContactAt) : 0;
                return customer.status !== "cancelado" && (Date.now() - last) / 86_400_000 > settings.contactLimitDays;
              }).length}{" "}
              contas estão acima do limite.
            </div>
          </SectionCard>
        </div>
      </div>

      {/* --------------------------------------------------------------- alerts */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Alertas automáticos" description="Sinais que alimentam a central de notificações" padded={false}>
          <ul className="divide-y divide-white/[0.05]">
            {ALERT_META.map((alert) => (
              <li key={alert.key} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[12px] font-medium text-text-primary">
                    <RiAlertLine className="size-3.5 text-amber-300" aria-hidden />
                    {alert.label}
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-text-tertiary">{alert.description}</p>
                </div>
                <Switch
                  size="sm"
                  isSelected={settings.alerts[alert.key]}
                  onChange={(selected) =>
                    patchSettings({ alerts: { ...settings.alerts, [alert.key]: selected } })
                  }
                  isDisabled={!isAdmin}
                  aria-label={alert.label}
                />
              </li>
            ))}
          </ul>
        </SectionCard>

        <div className="space-y-3">
          <SectionCard title="Preferências da experiência" description="Aplicadas a todos os usuários da organização">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium text-text-primary">Reduzir movimento</p>
                  <p className="mt-0.5 text-[10.5px] text-text-tertiary">
                    Desliga animações de entrada, contadores e o logo arrastável. Respeita também a
                    preferência do sistema operacional.
                  </p>
                </div>
                <Switch
                  size="sm"
                  isSelected={settings.reduceMotion}
                  onChange={(selected) => patchSettings({ reduceMotion: selected })}
                  isDisabled={!isAdmin}
                  aria-label="Reduzir movimento"
                />
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-white/[0.06] pt-3">
                <div>
                  <p className="text-[12px] font-medium text-text-primary">Atualização automática</p>
                  <p className="mt-0.5 text-[10.5px] text-text-tertiary">
                    Recalcula os scores ao abrir o dashboard e ao registrar interações.
                  </p>
                </div>
                <Switch
                  size="sm"
                  isSelected={settings.autoRefresh}
                  onChange={(selected) => patchSettings({ autoRefresh: selected })}
                  isDisabled={!isAdmin}
                  aria-label="Atualização automática"
                />
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent-400/15 bg-accent-500/[0.06] px-2.5 py-2 text-[10.5px] text-accent-100">
              <RiSparklingLine className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              O tema claro/escuro é uma preferência do navegador e pode ser alternado pelo botão no topo.
            </div>
          </SectionCard>

          <SectionCard title="Zona de risco" description="Ações irreversíveis sobre os dados de demonstração">
            <div className="flex flex-col gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[12px] font-semibold text-rose-100">Restaurar dados de demonstração</p>
                <p className="mt-0.5 text-[10.5px] text-rose-200/70">
                  Descarta alterações locais e recria clientes, interações e scores originais.
                </p>
              </div>
              <Button
                variant="danger"
                size="small"
                leadingIcon={RiRefreshLine}
                onClick={() => setResetOpen(true)}
              >
                Restaurar demo
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ------------------------------------------------------------- template */}
      <SectionCard
        title="Modelo de onboarding"
        description="Sequência aplicada quando uma nova conta entra na plataforma"
        action={
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="xs"
              leadingIcon={RiAddLine}
              disabled={!isAdmin}
              onClick={() =>
                setTemplate((current) => [
                  ...current,
                  {
                    name: "Nova etapa",
                    ownerRole: "csm",
                    days: (current[current.length - 1]?.days ?? 0) + 7,
                  },
                ])
              }
            >
              Adicionar
            </Button>
            <Button size="xs" leadingIcon={RiSave3Line} onClick={saveTemplate} disabled={!isAdmin}>
              Salvar modelo
            </Button>
          </div>
        }
        padded={false}
      >
        <ul className="divide-y divide-white/[0.05]">
          {template.map((step, index) => (
            <li key={index} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <span className="flex items-center gap-2 sm:w-8">
                <RiDragMove2Line className="size-3.5 text-text-disabled" aria-hidden />
                <span className="grid size-5 place-items-center rounded bg-white/[0.06] text-[9.5px] font-bold text-text-tertiary">
                  {index + 1}
                </span>
              </span>
              <Input
                aria-label={`Nome da etapa ${index + 1}`}
                value={step.name}
                onChange={(value) => updateStep(index, { name: value })}
                isDisabled={!isAdmin}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Select
                  aria-label={`Responsável da etapa ${index + 1}`}
                  size="sm"
                  selectedKey={step.ownerRole}
                  onSelectionChange={(key) => updateStep(index, { ownerRole: String(key) as Role })}
                  isDisabled={!isAdmin}
                  className="w-[140px]"
                >
                  {ROLES.map((role) => (
                    <SelectItem key={role} id={role}>
                      {roleLabel[role]}
                    </SelectItem>
                  ))}
                </Select>
                <div className="flex items-center gap-1">
                  <Input
                    aria-label={`Dia da etapa ${index + 1}`}
                    type="number"
                    value={String(step.days)}
                    onChange={(value) => updateStep(index, { days: Number(value) || 0 })}
                    isDisabled={!isAdmin}
                    className="w-[76px]"
                  />
                  <span className="text-[10px] text-text-tertiary">dias</span>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  leadingIcon={RiDeleteBin6Line}
                  aria-label={`Remover etapa ${step.name}`}
                  disabled={!isAdmin || template.length <= 1}
                  onClick={() => setTemplate((current) => current.filter((_, position) => position !== index))}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.06] px-4 py-2.5 text-[10.5px] text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <RiSettings3Line className="size-3.5 text-brand-cyan" aria-hidden />
            {template.length} etapas · {template[template.length - 1]?.days ?? 0} dias até o acompanhamento final
          </span>
          <span className="ml-auto">Contas já criadas mantêm a trilha original.</span>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10.5px] text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <RiRobot2Line className="size-3.5 text-brand-violet" aria-hidden />
          {data.tokens.filter((token) => !token.revokedAt).length} tokens MCP ativos nesta organização
        </span>
        <span className="flex items-center gap-1.5">
          <RiShieldCheckLine className="size-3.5 text-emerald-300" aria-hidden />
          Todas as alterações são registradas na auditoria
        </span>
        <span className="ml-auto">Ambiente de demonstração · dados locais</span>
      </div>

      <AlertDialog
        isOpen={resetOpen}
        onOpenChange={setResetOpen}
        title="Restaurar dados de demonstração?"
        description="Todos os registros criados ou editados neste navegador serão substituídos pelos dados originais. Esta ação não pode ser desfeita."
        confirmLabel="Restaurar agora"
        cancelLabel="Cancelar"
        onConfirm={() => {
          resetDemo();
          setResetOpen(false);
          toast.success("Dados de demonstração restaurados");
        }}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}
