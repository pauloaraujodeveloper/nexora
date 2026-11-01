import { useMemo, useState } from "react";
import {
  RiAddLine,
  RiArrowRightLine,
  RiBuilding2Line,
  RiFilter3Line,
  RiGroupLine,
  RiLayoutGridLine,
  RiListCheck2,
  RiMapPinLine,
  RiSearchLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { SearchField } from "@/components/base/search-field/search-field";
import { Select, SelectItem } from "@/components/base/select/select";
import { Pagination } from "@/components/base/pagination/pagination";
import { SegmentedControl, SegmentedControlItem } from "@/components/base/segmented-control/segmented-control";
import { PageHeader } from "@/components/nexora/page-header";
import { HealthRing } from "@/components/nexora/health-ring";
import { CustomerStatusPill, HealthBandPill } from "@/components/nexora/status-pill";
import { CustomerAvatar, OwnerChip, Tag } from "@/components/nexora/misc";
import { EmptyState } from "@/components/nexora/empty-state";
import { KpiStrip } from "@/components/nexora/kpi-strip";
import { FilterBar } from "@/components/nexora/filter-bar";
import { useApp, useOrgData } from "@/lib/store";
import { buildCustomerHealth, filterCustomers } from "@/lib/selectors";
import {
  daysUntil,
  formatCurrency,
  formatDate,
  relativeTime,
} from "@/lib/format";
import { useMotionEnabled, useReveal } from "@/lib/motion";
import type { CustomerFilters, CustomerStatus, HealthBand } from "@/lib/types";
import { navigate, useRoute } from "@/lib/router";
import { CustomerModal } from "@/components/modals/customer-modal";
import { cx } from "@/utils/cx";

const PAGE_SIZE = 10;

export function CustomersPage() {
  const { settings } = useApp();
  const data = useOrgData();
  const route = useRoute();
  const motion = useMotionEnabled(settings?.reduceMotion);
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<"tabela" | "cartoes">("tabela");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("risco");

  const [filters, setFilters] = useState<CustomerFilters>(() => ({
    q: route.query.get("q") ?? "",
    status: (route.query.get("status") as CustomerStatus) ?? "todos",
    band: (route.query.get("band") as HealthBand) ?? "todas",
    segment: "",
    owner: "",
    state: "",
    tag: "",
    lastContact: "todos",
  }));

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

  const filtered = useMemo(() => {
    const result = filterCustomers(health, filters, data.contacts);
    const sorted = [...result];
    switch (sort) {
      case "mrr":
        sorted.sort((a, b) => b.customer.mrr - a.customer.mrr);
        break;
      case "nome":
        sorted.sort((a, b) => a.customer.tradeName.localeCompare(b.customer.tradeName, "pt-BR"));
        break;
      case "renovacao":
        sorted.sort((a, b) => daysUntil(a.customer.renewalDate) - daysUntil(b.customer.renewalDate));
        break;
      case "saude":
        sorted.sort((a, b) => b.health.score - a.health.score);
        break;
      default:
        sorted.sort((a, b) => a.health.score - b.health.score || b.customer.mrr - a.customer.mrr);
    }
    return sorted;
  }, [health, filters, data.contacts, sort]);

  const revealRef = useReveal<HTMLDivElement>(motion, `${filters.q}-${filters.status}-${filters.band}-${sort}-${view}`);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const owners = data.users.filter((user) => ["csm", "gestor", "comercial", "admin"].includes(user.role));
  const segments = [...new Set(data.customers.map((customer) => customer.segment))].sort();
  const states = [...new Set(data.customers.map((customer) => customer.state))].sort();
  const tags = [...new Set(data.customers.flatMap((customer) => customer.tags))].sort();
  const activeFilters =
    Number(Boolean(filters.q.trim())) +
    Number(filters.status !== "todos") +
    Number(filters.band !== "todas") +
    Number(Boolean(filters.segment)) +
    Number(Boolean(filters.owner)) +
    Number(Boolean(filters.state)) +
    Number(Boolean(filters.tag)) +
    Number(filters.lastContact !== "todos");

  const mrr = filtered.reduce((sum, item) => sum + item.customer.mrr, 0);
  const avg = filtered.length
    ? Math.round(filtered.reduce((sum, item) => sum + item.health.score, 0) / filtered.length)
    : 0;

  function patch(next: Partial<CustomerFilters>) {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({
      q: "",
      status: "todos",
      band: "todas",
      segment: "",
      owner: "",
      state: "",
      tag: "",
      lastContact: "todos",
    });
    setPage(1);
  }

  return (
    <div ref={revealRef} className="space-y-4 pt-3">
      <PageHeader
        eyebrow="Carteira"
        title="Clientes"
        description="Toda a base em um só lugar — filtre por saúde, risco, responsável e momento do contrato."
        actions={
          <Button size="medium" leadingIcon={RiAddLine} onClick={() => setModalOpen(true)}>
            Nova conta
          </Button>
        }
      />

      <KpiStrip
        items={[
          {
            label: "Contas listadas",
            value: String(filtered.length),
            numeric: filtered.length,
            format: (value) => String(Math.round(value)),
            hint: `${data.customers.length} no total`,
            icon: RiGroupLine,
            tone: "cyan",
            animate: motion,
          },
          {
            label: "MRR filtrado",
            value: formatCurrency(mrr),
            numeric: mrr,
            format: (value) => formatCurrency(value),
            hint: "Somatório das contas visíveis",
            icon: RiBuilding2Line,
            tone: "violet",
            animate: motion,
          },
          {
            label: "Health médio",
            value: String(avg),
            numeric: avg,
            format: (value) => String(Math.round(value)),
            hint: "Média das contas visíveis",
            icon: RiListCheck2,
            tone: "green",
            animate: motion,
          },
          {
            label: "Em risco",
            value: String(filtered.filter((item) => item.health.band === "risco").length),
            hint: "Score abaixo do limite de atenção",
            icon: RiFilter3Line,
            tone: "rose",
            animate: motion,
          },
        ]}
      />

      <section data-reveal className="glass-card overflow-hidden">
        <div className="border-b border-white/[0.06] p-3">
          <FilterBar
            className="border-0 bg-transparent p-0"
            primary={
              <>
                <SearchField
                  aria-label="Buscar clientes"
                  placeholder="Buscar por nome, CNPJ, contato, tag…"
                  value={filters.q}
                  onChange={(value) => patch({ q: value })}
                  shape="rounded"
                  className="w-full sm:max-w-[320px]"
                />
                <SegmentedControl
                  aria-label="Visualização"
                  selectedKeys={[view]}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0];
                    if (key === "tabela" || key === "cartoes") setView(key);
                  }}
                  variant="solid"
                >
                  <SegmentedControlItem id="tabela" aria-label="Tabela">
                    <RiListCheck2 className="size-4" aria-hidden />
                  </SegmentedControlItem>
                  <SegmentedControlItem id="cartoes" aria-label="Cartões">
                    <RiLayoutGridLine className="size-4" aria-hidden />
                  </SegmentedControlItem>
                </SegmentedControl>
                <Select
                  aria-label="Ordenar"
                  size="sm"
                  selectedKey={sort}
                  onSelectionChange={(key) => setSort(String(key))}
                  className="w-[168px]"
                >
                  <SelectItem id="risco">Maior risco</SelectItem>
                  <SelectItem id="mrr">Maior MRR</SelectItem>
                  <SelectItem id="saude">Melhor saúde</SelectItem>
                  <SelectItem id="renovacao">Renovação próxima</SelectItem>
                  <SelectItem id="nome">Nome A–Z</SelectItem>
                </Select>
                <span className="hidden text-caption-2-regular text-text-tertiary lg:block">
                  {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
                </span>
              </>
            }
            activeCount={activeFilters}
            onClear={clearFilters}
            defaultOpen={activeFilters > 0}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Select aria-label="Status" size="sm" selectedKey={filters.status} onSelectionChange={(key) => patch({ status: String(key) as CustomerStatus })}>
                <SelectItem id="todos">Todos os status</SelectItem>
                <SelectItem id="ativo">Ativos</SelectItem>
                <SelectItem id="em_risco">Em risco</SelectItem>
                <SelectItem id="onboarding">Onboarding</SelectItem>
                <SelectItem id="cancelado">Cancelados</SelectItem>
              </Select>
              <Select aria-label="Saúde" size="sm" selectedKey={filters.band} onSelectionChange={(key) => patch({ band: String(key) as HealthBand })}>
                <SelectItem id="todas">Toda saúde</SelectItem>
                <SelectItem id="saudavel">Saudável</SelectItem>
                <SelectItem id="atencao">Atenção</SelectItem>
                <SelectItem id="risco">Risco</SelectItem>
              </Select>
              <Select aria-label="Segmento" size="sm" selectedKey={filters.segment || "todos"} onSelectionChange={(key) => patch({ segment: String(key) === "todos" ? "" : String(key) })}>
                <SelectItem id="todos">Todos os segmentos</SelectItem>
                {segments.map((item) => (
                  <SelectItem key={item} id={item}>
                    {item}
                  </SelectItem>
                ))}
              </Select>
              <Select aria-label="Responsável" size="sm" selectedKey={filters.owner || "todos"} onSelectionChange={(key) => patch({ owner: String(key) === "todos" ? "" : String(key) })}>
                <SelectItem id="todos">Todos os CSMs</SelectItem>
                {owners.map((user) => (
                  <SelectItem key={user.id} id={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </Select>
              <Select aria-label="UF" size="sm" selectedKey={filters.state || "todos"} onSelectionChange={(key) => patch({ state: String(key) === "todos" ? "" : String(key) })}>
                <SelectItem id="todos">Todos os estados</SelectItem>
                {states.map((item) => (
                  <SelectItem key={item} id={item}>
                    {item}
                  </SelectItem>
                ))}
              </Select>
              <Select aria-label="Último contato" size="sm" selectedKey={filters.lastContact} onSelectionChange={(key) => patch({ lastContact: String(key) as CustomerFilters["lastContact"] })}>
                <SelectItem id="todos">Qualquer contato</SelectItem>
                <SelectItem id="30">Sem contato 30+</SelectItem>
                <SelectItem id="60">Sem contato 60+</SelectItem>
                <SelectItem id="90">Sem contato 90+</SelectItem>
              </Select>
            </div>

            {tags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="me-1 flex items-center gap-1 text-caption-2-semibold tracking-wider text-text-tertiary uppercase">
                  <RiFilter3Line className="size-3" aria-hidden /> Tags
                </span>
                {tags.slice(0, 12).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => patch({ tag: filters.tag === tag ? "" : tag })}
                    className={cx(
                      "rounded-md border px-1.5 py-0.5 text-caption-2-regular transition-colors",
                      filters.tag === tag
                        ? "border-accent-400/50 bg-accent-500/15 text-accent-200"
                        : "border-separator-border bg-background-secondary-default text-text-tertiary hover:border-separator-border-strong hover:text-text-secondary",
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
          </FilterBar>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={RiSearchLine}
            title="Nenhuma conta encontrada"
            description="Ajuste a busca ou limpe os filtros para ver a carteira completa."
            action={
              <Button variant="secondary" size="small" onClick={clearFilters}>
                Limpar filtros
              </Button>
            }
          />
        ) : view === "tabela" ? (
          <div className="nx-scroll overflow-x-auto">
            <table className="nx-table min-w-[980px]">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Saúde</th>
                  <th className="text-right">MRR</th>
                  <th>Responsável</th>
                  <th>Último contato</th>
                  <th>Renovação</th>
                  <th aria-label="Abrir" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ customer, health: itemHealth, owner, daysWithoutContact }) => (
                  <tr
                    key={customer.id}
                    onClick={() => navigate(`clientes/${customer.id}`)}
                    className="cursor-pointer"
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        <CustomerAvatar customer={customer} size={34} />
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-semibold text-text-primary">{customer.tradeName}</p>
                          <p className="flex items-center gap-1 truncate text-[10.5px] text-text-tertiary">
                            <RiMapPinLine className="size-3" aria-hidden />
                            {customer.segment} · {customer.city}/{customer.state}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <CustomerStatusPill status={customer.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <HealthRing score={itemHealth.score} band={itemHealth.band} size={34} stroke={3.5} animated={false} />
                        <div className="min-w-0">
                          <HealthBandPill band={itemHealth.band} />
                          <p className="mt-0.5 text-[9.5px] text-text-tertiary">
                            {itemHealth.components.find((component) => component.key === "usage")?.detail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right">
                      <p className="text-[12.5px] font-semibold text-text-primary tabular-nums">{formatCurrency(customer.mrr)}</p>
                      <p className="text-[10px] text-text-tertiary">{customer.plan}</p>
                    </td>
                    <td>
                      <OwnerChip user={owner} />
                    </td>
                    <td>
                      <p className={cx("text-[11.5px]", daysWithoutContact > (settings?.contactLimitDays ?? 30) ? "text-amber-300" : "text-text-secondary")}>
                        {relativeTime(customer.lastContactAt)}
                      </p>
                      <p className="text-[10px] text-text-tertiary">{daysWithoutContact}d sem contato</p>
                    </td>
                    <td>
                      <p className="text-[11.5px] text-text-secondary">{formatDate(customer.renewalDate)}</p>
                      <p className="text-[10px] text-text-tertiary">{daysUntil(customer.renewalDate)} dias</p>
                    </td>
                    <td>
                      <RiArrowRightLine className="size-4 text-text-disabled" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ customer, health: itemHealth, owner, daysWithoutContact }) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => navigate(`clientes/${customer.id}`)}
                className="glass-card hover-lift group flex flex-col gap-3 p-3.5 text-left"
              >
                <div className="flex items-start gap-2.5">
                  <CustomerAvatar customer={customer} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-text-primary">{customer.tradeName}</p>
                    <p className="truncate text-[10.5px] text-text-tertiary">
                      {customer.segment} · {customer.city}/{customer.state}
                    </p>
                  </div>
                  <HealthRing score={itemHealth.score} band={itemHealth.band} size={44} stroke={4} animated={motion} />
                </div>
                <div className="flex items-center gap-1.5">
                  <CustomerStatusPill status={customer.status} />
                  <HealthBandPill band={itemHealth.band} />
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-2.5 text-[11px]">
                  <div>
                    <p className="text-[9.5px] tracking-wider text-text-tertiary uppercase">MRR</p>
                    <p className="font-semibold text-text-primary">{formatCurrency(customer.mrr)}</p>
                  </div>
                  <div>
                    <p className="text-[9.5px] tracking-wider text-text-tertiary uppercase">Renovação</p>
                    <p className="text-text-secondary">{formatDate(customer.renewalDate)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <OwnerChip user={owner} />
                  <span className={cx("text-[10px]", daysWithoutContact > 30 ? "text-amber-300" : "text-text-tertiary")}>
                    {daysWithoutContact}d sem contato
                  </span>
                </div>
                {customer.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.slice(0, 3).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        )}

        {filtered.length > PAGE_SIZE ? (
          <div className="flex flex-col gap-2 border-t border-white/[0.06] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-text-tertiary">
              Exibindo {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
              previousLabel="Anterior"
              nextLabel="Próxima"
              aria-label="Paginação de clientes"
            />
          </div>
        ) : null}
      </section>

      {modalOpen ? (
        <CustomerModal
          isOpen={modalOpen}
          onOpenChange={setModalOpen}
          orgId={data.orgId}
          users={data.users}
        />
      ) : null}
    </div>
  );
}
