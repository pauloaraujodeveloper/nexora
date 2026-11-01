import { useMemo, useState } from "react";
import {
  RiDownloadLine,
  RiHistoryLine,
  RiRobot2Line,
  RiSearchLine,
  RiShieldCheckLine,
  RiUserLine,
  RiTimeLine,
  RiCodeBoxLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { SearchField } from "@/components/base/search-field/search-field";
import { Select, SelectItem } from "@/components/base/select/select";
import { Pagination } from "@/components/base/pagination/pagination";
import { PageHeader } from "@/components/nexora/page-header";
import { SectionCard } from "@/components/nexora/section-card";
import { KpiStrip } from "@/components/nexora/kpi-strip";
import { FilterBar } from "@/components/nexora/filter-bar";
import { EmptyState } from "@/components/nexora/empty-state";
import { Tag, UserAvatar } from "@/components/nexora/misc";
import { useApp, useOrgData } from "@/lib/store";
import { formatDateTime, formatDate, relativeTime } from "@/lib/format";
import { useMotionEnabled, useReveal } from "@/lib/motion";
import { toast } from "@/components/base/toast/toast";
import type { AuditEntry } from "@/lib/types";
import { cx } from "@/utils/cx";

const PAGE_SIZE = 14;

const ACTION_LABEL: Record<string, string> = {
  "auth.login": "Login realizado",
  "auth.logout": "Sessão encerrada",
  "customer.created": "Cliente criado",
  "customer.updated": "Cliente atualizado",
  "contact.created": "Contato criado",
  "interaction.created": "Interação registrada",
  "onboarding.step_updated": "Etapa de onboarding atualizada",
  "opportunity.created": "Oportunidade criada",
  "opportunity.updated": "Oportunidade atualizada",
  "task.created": "Tarefa criada",
  "task.updated": "Tarefa atualizada",
  "token.created": "Token MCP criado",
  "token.revoked": "Token MCP revogado",
  "settings.updated": "Configurações atualizadas",
  "score.recalculated": "Health score recalculado",
  "mcp.tool_call": "Chamada de ferramenta MCP",
  "demo.reset": "Dados de demonstração restaurados",
};

const ACTOR_META = {
  user: { label: "Usuário", tone: "nx-status-info", icon: RiUserLine },
  mcp: { label: "Agente MCP", tone: "nx-status-violet", icon: RiRobot2Line },
  system: { label: "Sistema", tone: "nx-status-neutral", icon: RiCodeBoxLine },
} as const;

type Period = "7" | "30" | "90" | "todos";
type ActorFilter = "todos" | AuditEntry["actorKind"];

function actionLabel(action: string) {
  return ACTION_LABEL[action] ?? action;
}

function detailsText(entry: AuditEntry) {
  const details = entry.details ?? {};
  const description = typeof details.description === "string" ? details.description : "";
  if (description) return description;
  const fields = Array.isArray(details.fields) ? (details.fields as string[]) : null;
  if (fields) return `Campos alterados: ${fields.join(", ")}`;
  if (typeof details.result === "string") return `Resultado: ${details.result}`;
  return entry.entity ? `Entidade: ${entry.entity}` : "Sem detalhes adicionais";
}

export function AuditPage() {
  const { settings } = useApp();
  const data = useOrgData();
  const motion = useMotionEnabled(settings?.reduceMotion);

  const [q, setQ] = useState("");
  const [actor, setActor] = useState<ActorFilter>("todos");
  const [action, setAction] = useState("todas");
  const [period, setPeriod] = useState<Period>("30");
  const [page, setPage] = useState(1);

  const revealRef = useReveal<HTMLDivElement>(motion, `${q}-${actor}-${action}-${period}`);

  const actions = useMemo(
    () => [...new Set(data.audit.map((entry) => entry.action))].sort(),
    [data.audit],
  );

  const filtered = useMemo(() => {
    const cutoff =
      period === "todos" ? 0 : Date.now() - Number(period) * 86_400_000;
    const needle = q.trim().toLowerCase();
    return data.audit
      .filter((entry) => (actor === "todos" ? true : entry.actorKind === actor))
      .filter((entry) => (action === "todas" ? true : entry.action === action))
      .filter((entry) => (cutoff === 0 ? true : +new Date(entry.at) >= cutoff))
      .filter((entry) => {
        if (!needle) return true;
        const user = data.users.find((item) => item.id === entry.actorUserId);
        return [
          entry.action,
          actionLabel(entry.action),
          entry.entity ?? "",
          detailsText(entry),
          user?.name ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [data.audit, data.users, actor, action, period, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const mcpCount = data.audit.filter((entry) => entry.actorKind === "mcp").length;
  const userCount = data.audit.filter((entry) => entry.actorKind === "user").length;
  const last = data.audit.reduce<string | null>(
    (latest, entry) => (!latest || +new Date(entry.at) > +new Date(latest) ? entry.at : latest),
    null,
  );

  function patch(next: () => void) {
    next();
    setPage(1);
  }

  function exportCsv() {
    const header = ["data", "ator", "acao", "entidade", "detalhes"];
    const lines = filtered.map((entry) => {
      const user = data.users.find((item) => item.id === entry.actorUserId);
      return [
        formatDateTime(entry.at),
        user?.name ?? ACTOR_META[entry.actorKind].label,
        actionLabel(entry.action),
        entry.entity ?? "",
        detailsText(entry),
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(";");
    });
    const csv = [header.join(";"), ...lines].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nexora-auditoria-${formatDate(new Date()).split("/").reverse().join("-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Trilha exportada", { description: `${filtered.length} registros em CSV.` });
  }

  return (
    <div ref={revealRef} className="space-y-4 pt-3">
      <PageHeader
        eyebrow="Governança"
        title="Auditoria"
        description="Quem fez o quê, quando e em qual entidade — incluindo cada chamada de agente via MCP."
        actions={
          <Button
            variant="secondary"
            size="medium"
            leadingIcon={RiDownloadLine}
            onClick={exportCsv}
            disabled={filtered.length === 0}
          >
            Exportar CSV
          </Button>
        }
      />

      <KpiStrip
        items={[
          {
            label: "Eventos registrados",
            value: String(data.audit.length),
            numeric: data.audit.length,
            format: (value) => String(Math.round(value)),
            hint: "Histórico desta organização",
            icon: RiHistoryLine,
            tone: "cyan",
            animate: motion,
          },
          {
            label: "Ações de usuários",
            value: String(userCount),
            numeric: userCount,
            format: (value) => String(Math.round(value)),
            hint: "Inclui logins e edições",
            icon: RiUserLine,
            tone: "violet",
            animate: motion,
          },
          {
            label: "Chamadas MCP",
            value: String(mcpCount),
            numeric: mcpCount,
            format: (value) => String(Math.round(value)),
            hint: "Feitas por agentes e tokens",
            icon: RiRobot2Line,
            tone: "green",
            animate: motion,
          },
          {
            label: "Último evento",
            value: last ? relativeTime(last) : "—",
            hint: last ? formatDateTime(last) : "Nenhum registro",
            icon: RiTimeLine,
            tone: "amber",
            animate: false,
          },
        ]}
      />

      <SectionCard padded={false}>
        <div className="border-b border-white/[0.06] p-3">
          <FilterBar
            className="border-0 bg-transparent p-0"
            primary={
              <>
                <SearchField
                  aria-label="Buscar na auditoria"
                  placeholder="Buscar por ação, ator, entidade ou detalhe…"
                  value={q}
                  onChange={(value) => patch(() => setQ(value))}
                  shape="rounded"
                  className="w-full sm:max-w-[380px]"
                />
                <span className="flex items-center gap-2 text-caption-2-regular text-text-tertiary sm:ms-auto">
                  <RiShieldCheckLine className="size-3.5 text-state-success-text" aria-hidden />
                  Registros imutáveis · somente leitura
                </span>
                <span className="hidden text-caption-2-regular text-text-tertiary lg:block">
                  {filtered.length} registro{filtered.length === 1 ? "" : "s"}
                </span>
              </>
            }
            activeCount={
              Number(Boolean(q.trim())) +
              Number(actor !== "todos") +
              Number(action !== "todas") +
              Number(period !== "30")
            }
            onClear={() =>
              patch(() => {
                setQ("");
                setActor("todos");
                setAction("todas");
                setPeriod("30");
              })
            }
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Select
                aria-label="Ator"
                size="sm"
                selectedKey={actor}
                onSelectionChange={(key) => patch(() => setActor(String(key) as ActorFilter))}
              >
                <SelectItem id="todos">Todos os atores</SelectItem>
                <SelectItem id="user">Usuários</SelectItem>
                <SelectItem id="mcp">Agentes MCP</SelectItem>
                <SelectItem id="system">Sistema</SelectItem>
              </Select>
              <Select
                aria-label="Ação"
                size="sm"
                selectedKey={action}
                onSelectionChange={(key) => patch(() => setAction(String(key)))}
              >
                <SelectItem id="todas">Todas as ações</SelectItem>
                {actions.map((item) => (
                  <SelectItem key={item} id={item}>
                    {actionLabel(item)}
                  </SelectItem>
                ))}
              </Select>
              <Select
                aria-label="Período"
                size="sm"
                selectedKey={period}
                onSelectionChange={(key) => patch(() => setPeriod(String(key) as Period))}
              >
                <SelectItem id="7">Últimos 7 dias</SelectItem>
                <SelectItem id="30">Últimos 30 dias</SelectItem>
                <SelectItem id="90">Últimos 90 dias</SelectItem>
                <SelectItem id="todos">Todo o período</SelectItem>
              </Select>
            </div>
          </FilterBar>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={RiSearchLine}
            title="Nenhum registro encontrado"
            description="Ajuste o período, o ator ou a ação para ampliar a busca."
          />
        ) : (
          <div className="nx-scroll overflow-x-auto">
            <table className="nx-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Ator</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => {
                  const user = data.users.find((item) => item.id === entry.actorUserId);
                  const meta = ACTOR_META[entry.actorKind];
                  const token = entry.tokenId ? data.tokens.find((item) => item.id === entry.tokenId) : null;
                  return (
                    <tr key={entry.id}>
                      <td>
                        <p className="text-[11.5px] font-medium text-text-primary">{formatDateTime(entry.at)}</p>
                        <p className="text-[10px] text-text-tertiary">{relativeTime(entry.at)}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {user ? (
                            <UserAvatar user={user} size="xs" />
                          ) : (
                            <span className={cx("grid size-5 place-items-center rounded-full", meta.tone)}>
                              <meta.icon className="size-3" aria-hidden />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-[11.5px] text-text-primary">
                              {user?.name ?? meta.label}
                            </p>
                            <p className="truncate text-[10px] text-text-tertiary">
                              {token ? token.label : user ? user.email : meta.label}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={cx("nx-status-pill px-2 py-0.5 text-[10.5px]", meta.tone)}>
                          {actionLabel(entry.action)}
                        </span>
                        <p className="mt-0.5 font-mono text-[9.5px] text-text-tertiary">{entry.action}</p>
                      </td>
                      <td>
                        <p className="text-[11px] text-text-secondary">{entry.entity ?? "—"}</p>
                        {entry.entityId ? (
                          <p className="truncate font-mono text-[9.5px] text-text-tertiary">{entry.entityId}</p>
                        ) : null}
                      </td>
                      <td>
                        <p className="max-w-[320px] text-[11px] leading-relaxed text-text-secondary">
                          {detailsText(entry)}
                        </p>
                        {entry.actorKind === "mcp" ? (
                          <span className="mt-1 inline-flex">
                            <Tag>via MCP</Tag>
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > PAGE_SIZE ? (
          <div className="flex flex-col gap-2 border-t border-white/[0.06] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-text-tertiary">
              Exibindo {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
              previousLabel="Anterior"
              nextLabel="Próxima"
              aria-label="Paginação da auditoria"
            />
          </div>
        ) : null}
      </SectionCard>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[10.5px] text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <RiShieldCheckLine className="size-3.5 text-emerald-300" aria-hidden />
          Retenção de 12 meses na demonstração
        </span>
        <span>Eventos do sistema são gerados automaticamente</span>
        <span className="ml-auto">Organização {data.orgId}</span>
      </div>
    </div>
  );
}
