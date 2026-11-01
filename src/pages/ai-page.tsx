import { useState } from "react";
import {
  RiAddLine,
  RiCheckLine,
  RiCodeSSlashLine,
  RiFileCopyLine,
  RiKey2Line,
  RiLock2Line,
  RiPlugLine,
  RiRefreshLine,
  RiRobot2Line,
  RiShieldCheckLine,
  RiTerminalBoxLine,
  RiTimeLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { AlertDialog } from "@/components/base/modal/modal";
import { PageHeader } from "@/components/nexora/page-header";
import { KpiStrip } from "@/components/nexora/kpi-strip";
import { SectionCard } from "@/components/nexora/section-card";
import { IconTile, Tag, UserAvatar } from "@/components/nexora/misc";
import { EmptyState } from "@/components/nexora/empty-state";
import { useApp, useOrgData } from "@/lib/store";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { useMotionEnabled, useReveal } from "@/lib/motion";
import { TokenModal } from "@/components/modals/action-modals";
import { toast } from "@/components/base/toast/toast";
import { cx } from "@/utils/cx";

const TOOLS = [
  { name: "list_customers", scope: "read:customers", method: "GET", description: "Lista contas com filtros de status, saúde e responsável." },
  { name: "get_customer_360", scope: "read:customers", method: "GET", description: "Retorna cadastro, contatos, saúde e últimas interações de uma conta." },
  { name: "search_interactions", scope: "read:interactions", method: "GET", description: "Busca no histórico por texto, tipo, sentimento e período." },
  { name: "get_health_score", scope: "read:health", method: "GET", description: "Score atual, componentes, fatores e histórico mensal." },
  { name: "get_dashboard_metrics", scope: "read:dashboard", method: "GET", description: "KPIs agregados de MRR, risco, onboarding e renovações." },
  { name: "list_onboarding", scope: "read:customers", method: "GET", description: "Etapas de implantação por conta, com prazos e bloqueios." },
  { name: "create_interaction", scope: "write:interactions", method: "POST", description: "Registra uma interação em nome do usuário autenticado." },
  { name: "create_task", scope: "write:tasks", method: "POST", description: "Cria um próximo passo com prazo, prioridade e responsável." },
];

const SNIPPET = `{
  "mcpServers": {
    "nexora": {
      "command": "npx",
      "args": ["-y", "@nexora/mcp-server"],
      "env": {
        "NEXORA_API_URL": "https://api.nexora.app/mcp",
        "NEXORA_TOKEN": "nxr_..."
      }
    }
  }
}`;

export function AiPage() {
  const { dispatch } = useApp();
  const data = useOrgData();
  const motion = useMotionEnabled(data.settings?.reduceMotion);
  const [modalOpen, setModalOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [toolFilter, setToolFilter] = useState<"todos" | "read" | "write">("todos");

  const revealRef = useReveal<HTMLDivElement>(motion, toolFilter);

  const tokens = data.tokens;
  const active = tokens.filter((token) => !token.revokedAt);
  const mcpAudit = data.audit.filter((entry) => entry.actorKind === "mcp");
  const expiring = active.filter((token) => +new Date(token.expiresAt) - Date.now() < 30 * 86_400_000);
  const scopes = [...new Set(tokens.flatMap((token) => token.scopes))];

  const filteredTools = TOOLS.filter((tool) => {
    if (toolFilter === "read") return tool.scope.startsWith("read");
    if (toolFilter === "write") return tool.scope.startsWith("write");
    return true;
  });

  const tokenToRevoke = tokens.find((token) => token.id === revokeId);

  return (
    <div ref={revealRef} className="space-y-4 pt-3">
      <PageHeader
        eyebrow="Inteligência"
        title="IA & MCP"
        description="Conecte Claude e outros agentes ao contexto da sua carteira com escopos mínimos e trilha de auditoria."
        actions={
          <Button size="medium" leadingIcon={RiAddLine} onClick={() => setModalOpen(true)}>
            Novo token
          </Button>
        }
      />

      <KpiStrip
        items={[
          {
            label: "Tokens ativos",
            value: String(active.length),
            numeric: active.length,
            format: (value) => String(Math.round(value)),
            hint: `${tokens.length} emitidos no total`,
            icon: RiKey2Line,
            tone: "cyan",
            animate: motion,
          },
          {
            label: "Chamadas MCP",
            value: String(mcpAudit.length),
            numeric: mcpAudit.length,
            format: (value) => String(Math.round(value)),
            hint: "Registradas na auditoria",
            icon: RiRobot2Line,
            tone: "violet",
            animate: motion,
          },
          {
            label: "Escopos em uso",
            value: String(scopes.length),
            numeric: scopes.length,
            format: (value) => String(Math.round(value)),
            hint: "Leitura e escrita",
            icon: RiShieldCheckLine,
            tone: "green",
            animate: motion,
          },
          {
            label: "Expirando em 30 d",
            value: String(expiring.length),
            numeric: expiring.length,
            format: (value) => String(Math.round(value)),
            hint: "Renove antes de perder acesso",
            icon: RiTimeLine,
            tone: expiring.length > 0 ? "amber" : "green",
            animate: motion,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.55fr_1fr]">
        <SectionCard
          title="Ferramentas expostas"
          description="Cada ferramenta exige o escopo indicado"
          action={
            <div className="flex gap-1">
              {(["todos", "read", "write"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setToolFilter(item)}
                  className={cx(
                    "rounded-md px-2 py-1 text-[10.5px] font-medium capitalize transition-colors",
                    toolFilter === item
                      ? "bg-accent-500/15 text-accent-200 ring-1 ring-accent-400/30"
                      : "text-text-tertiary hover:bg-white/[0.05]",
                  )}
                >
                  {item === "todos" ? "Todas" : item}
                </button>
              ))}
            </div>
          }
          padded={false}
        >
          <ul className="divide-y divide-white/[0.05]">
            {filteredTools.map((tool) => (
              <li key={tool.name} className="flex items-start gap-2.5 px-4 py-2.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-text-secondary ring-1 ring-white/10">
                  <RiTerminalBoxLine className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <code className="text-[11.5px] font-semibold text-text-primary">{tool.name}</code>
                    <span
                      className={cx(
                        "rounded px-1 py-px text-[9px] font-bold",
                        tool.method === "GET"
                          ? "bg-cyan-400/10 text-cyan-300"
                          : "bg-amber-400/10 text-amber-300",
                      )}
                    >
                      {tool.method}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-text-tertiary">{tool.description}</p>
                </div>
                <code className="hidden shrink-0 rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-text-tertiary sm:block">
                  {tool.scope}
                </code>
              </li>
            ))}
          </ul>
        </SectionCard>

        <div className="space-y-3">
          <SectionCard title="Conectar ao Claude Desktop" description="Exemplo de configuração local">
            <div className="nx-code overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-1.5">
                <span className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
                  <RiCodeSSlashLine className="size-3" aria-hidden />
                  claude_desktop_config.json
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  leadingIcon={RiFileCopyLine}
                  onClick={() => {
                    navigator.clipboard?.writeText(SNIPPET).catch(() => undefined);
                    toast.success("Snippet copiado");
                  }}
                >
                  Copiar
                </Button>
              </div>
              <pre className="nx-scroll overflow-x-auto p-3 text-[10.5px] leading-relaxed text-text-secondary">
                <code>{SNIPPET}</code>
              </pre>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.06] px-2.5 py-2 text-[10.5px] text-amber-200">
              <RiLock2Line className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Tokens são exibidos uma única vez. Guarde-os em um cofre de segredos, nunca no repositório.
            </div>
          </SectionCard>

          <SectionCard title="Como o MCP funciona" description="Do agente até a auditoria">
            <ol className="space-y-2.5">
              {[
                { title: "Autenticação", text: "O agente envia o token no cabeçalho Authorization." },
                { title: "Escopo", text: "Cada ferramenta valida os escopos concedidos ao token." },
                { title: "Contexto", text: "A resposta inclui cliente, saúde e histórico relevantes." },
                { title: "Auditoria", text: "Toda escrita registra ator, token e payload na trilha." },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-500/15 text-[9px] font-bold text-accent-200 ring-1 ring-accent-400/25">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[11.5px] font-medium text-text-primary">{step.title}</p>
                    <p className="text-[10.5px] text-text-tertiary">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Tokens emitidos"
        description="Credenciais por usuário, com expiração e escopo"
        padded={false}
      >
        {tokens.length ? (
          <div className="nx-scroll overflow-x-auto">
            <table className="nx-table min-w-[860px]">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Usuário</th>
                  <th>Escopos</th>
                  <th>Último uso</th>
                  <th>Expira</th>
                  <th>Status</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => {
                  const user = data.users.find((entry) => entry.id === token.userId);
                  const revoked = Boolean(token.revokedAt);
                  const expired = +new Date(token.expiresAt) < Date.now();
                  return (
                    <tr key={token.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="grid size-7 place-items-center rounded-lg bg-white/[0.05] text-text-secondary ring-1 ring-white/10">
                            <RiKey2Line className="size-3.5" aria-hidden />
                          </span>
                          <div>
                            <p className="text-[12px] font-medium text-text-primary">{token.label}</p>
                            <code className="text-[9.5px] text-text-tertiary">{token.tokenPreview}</code>
                          </div>
                        </div>
                      </td>
                      <td>
                        {user ? (
                          <span className="flex items-center gap-1.5">
                            <UserAvatar user={user} size="xs" />
                            <span className="text-[11px] text-text-secondary">{user.name}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-text-tertiary">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {token.scopes.slice(0, 2).map((scope) => (
                            <Tag key={scope}>{scope}</Tag>
                          ))}
                          {token.scopes.length > 2 ? <Tag>+{token.scopes.length - 2}</Tag> : null}
                        </div>
                      </td>
                      <td className="text-[11px]">{token.lastUsedAt ? relativeTime(token.lastUsedAt) : "nunca"}</td>
                      <td className="text-[11px]">{formatDate(token.expiresAt)}</td>
                      <td>
                        {revoked ? (
                          <span className="nx-status-pill nx-status-neutral">Revogado</span>
                        ) : expired ? (
                          <span className="nx-status-pill nx-status-risk">Expirado</span>
                        ) : (
                          <span className="nx-status-pill nx-status-healthy">Ativo</span>
                        )}
                      </td>
                      <td>
                        {!revoked ? (
                          <Button variant="ghost" size="xs" onClick={() => setRevokeId(token.id)}>
                            Revogar
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={RiPlugLine}
            title="Nenhum token emitido"
            description="Crie um token para conectar um agente ao contexto da carteira."
            action={
              <Button variant="secondary" size="small" onClick={() => setModalOpen(true)}>
                Criar token
              </Button>
            }
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <SectionCard title="Atividade MCP recente" description="Escritas feitas por agentes" padded={false}>
          {mcpAudit.length ? (
            <ul className="divide-y divide-white/[0.05]">
              {mcpAudit.slice(0, 6).map((entry) => {
                const token = tokens.find((item) => item.id === entry.tokenId);
                return (
                  <li key={entry.id} className="flex items-start gap-2.5 px-4 py-2.5">
                    <IconTile icon={RiRobot2Line} tone="violet" className="size-7" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-medium text-text-primary">{entry.action}</p>
                      <p className="text-[10px] text-text-tertiary">
                        {token?.label ?? "Token"} · {formatDateTime(entry.at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact title="Sem atividade MCP" description="As chamadas de agentes aparecerão aqui." />
          )}
        </SectionCard>

        <SectionCard title="Boas práticas de escopo" description="Menor privilégio por padrão">
          <ul className="space-y-2.5">
            {[
              "Comece com escopos de leitura e expanda só quando necessário.",
              "Um token por agente ou automação, nunca compartilhado.",
              "Defina expiração curta para experimentos e renove com intenção.",
              "Revise a auditoria semanalmente para detectar uso anômalo.",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-[11.5px] text-text-secondary">
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-emerald-400/12 text-emerald-300">
                  <RiCheckLine className="size-2.5" aria-hidden />
                </span>
                {tip}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2 text-[10.5px] text-text-tertiary">
            <RiRefreshLine className="size-3.5 shrink-0 text-brand-cyan" aria-hidden />
            O token de demonstração expira em até 1 ano e pode ser revogado a qualquer momento.
          </div>
        </SectionCard>
      </div>

      {modalOpen ? (
        <TokenModal
          isOpen={modalOpen}
          onOpenChange={setModalOpen}
          orgId={data.orgId}
          userId={data.users[0]?.id ?? ""}
        />
      ) : null}

      <AlertDialog
        isOpen={Boolean(revokeId)}
        onOpenChange={(open) => setRevokeId(open ? revokeId : null)}
        title="Revogar token?"
        description={`O token "${tokenToRevoke?.label ?? ""}" deixará de funcionar imediatamente. Agentes conectados perderão o acesso.`}
        confirmLabel="Revogar token"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (revokeId) {
            dispatch({ type: "revokeToken", id: revokeId });
            toast.success("Token revogado");
          }
          setRevokeId(null);
        }}
        onCancel={() => setRevokeId(null)}
      />
    </div>
  );
}
