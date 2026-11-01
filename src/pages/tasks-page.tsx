import { useMemo, useState } from "react";
import {
  RiAddLine,
  RiAlertLine,
  RiCalendarCheckLine,
  RiCheckboxCircleLine,
  RiListCheck2,
  RiSearchLine,
  RiTimeLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { SearchField } from "@/components/base/search-field/search-field";
import { Select, SelectItem } from "@/components/base/select/select";
import { PageHeader } from "@/components/nexora/page-header";
import { KpiStrip } from "@/components/nexora/kpi-strip";
import { FilterBar } from "@/components/nexora/filter-bar";
import { SectionCard } from "@/components/nexora/section-card";
import { TaskBoard } from "@/components/nexora/task-board";
import { EmptyState } from "@/components/nexora/empty-state";
import { useApp, useOrgData } from "@/lib/store";
import { daysUntil } from "@/lib/format";
import { useMotionEnabled, useReveal } from "@/lib/motion";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";
import { TaskModal } from "@/components/modals/action-modals";
import { toast } from "@/components/base/toast/toast";
import { cx } from "@/utils/cx";

export function TasksPage() {
  const { settings, dispatch, currentUser } = useApp();
  const data = useOrgData();
  const motion = useMotionEnabled(settings?.reduceMotion);
  const [modalOpen, setModalOpen] = useState(false);
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "todas">("todas");
  const [assignee, setAssignee] = useState("todos");
  const [onlyMine, setOnlyMine] = useState(false);

  const revealRef = useReveal<HTMLDivElement>(motion, `${q}-${priority}-${assignee}-${onlyMine}`);

  const tasks = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.tasks
      .filter((task) => (priority === "todas" ? true : task.priority === priority))
      .filter((task) => (assignee === "todos" ? true : task.assigneeId === assignee))
      .filter((task) => (onlyMine ? task.assigneeId === currentUser?.id : true))
      .filter((task) => {
        if (!term) return true;
        const customer = data.customers.find((entry) => entry.id === task.customerId);
        return `${task.title} ${customer?.tradeName ?? ""}`.toLowerCase().includes(term);
      })
      .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  }, [data.tasks, data.customers, q, priority, assignee, onlyMine, currentUser?.id]);

  const openTasks = data.tasks.filter((task) => task.status !== "concluida");
  const late = openTasks.filter((task) => daysUntil(task.dueDate) < 0);
  const today = openTasks.filter((task) => daysUntil(task.dueDate) === 0);
  const done = data.tasks.filter((task) => task.status === "concluida");

  function moveTask(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    dispatch({ type: "updateTask", id: task.id, patch: { status } });
    if (status === "concluida") {
      toast.success("Tarefa concluída", { description: task.title });
    } else if (status === "em_andamento") {
      toast.info("Tarefa em andamento", { description: task.title });
    } else {
      toast.info("Tarefa reaberta", { description: task.title });
    }
  }

  function deferTask(task: Task) {
    dispatch({
      type: "updateTask",
      id: task.id,
      patch: { dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString() },
    });
    toast.info("Prazo adiado em 7 dias", { description: task.title });
  }

  return (
    <div ref={revealRef} className="space-y-4 pt-3">
      <PageHeader
        eyebrow="Execução"
        title="Tarefas"
        description="Os próximos passos que mantêm cada conta avançando — com prazo, prioridade e responsável."
        actions={
          <Button size="medium" leadingIcon={RiAddLine} onClick={() => setModalOpen(true)}>
            Nova tarefa
          </Button>
        }
      />

      <KpiStrip
        items={[
          {
            label: "Abertas",
            value: String(openTasks.length),
            numeric: openTasks.length,
            format: (value) => String(Math.round(value)),
            hint: `${data.tasks.length} no total`,
            icon: RiListCheck2,
            tone: "cyan",
            animate: motion,
          },
          {
            label: "Atrasadas",
            value: String(late.length),
            numeric: late.length,
            format: (value) => String(Math.round(value)),
            hint: "Priorize estas primeiro",
            icon: RiAlertLine,
            tone: "rose",
            animate: motion,
          },
          {
            label: "Para hoje",
            value: String(today.length),
            numeric: today.length,
            format: (value) => String(Math.round(value)),
            hint: "Vencem hoje",
            icon: RiTimeLine,
            tone: "amber",
            animate: motion,
          },
          {
            label: "Concluídas",
            value: String(done.length),
            numeric: done.length,
            format: (value) => String(Math.round(value)),
            hint: "Histórico da organização",
            icon: RiCheckboxCircleLine,
            tone: "green",
            animate: motion,
          },
        ]}
      />

      <FilterBar
        primary={
          <SearchField
            aria-label="Buscar tarefas"
            placeholder="Buscar por tarefa ou conta…"
            value={q}
            onChange={setQ}
            shape="rounded"
            className="w-full sm:max-w-[320px]"
          />
        }
        activeCount={
          Number(q.trim().length > 0) +
          Number(priority !== "todas") +
          Number(assignee !== "todos") +
          Number(onlyMine)
        }
        onClear={() => {
          setQ("");
          setPriority("todas");
          setAssignee("todos");
          setOnlyMine(false);
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Prioridade"
            size="sm"
            selectedKey={priority}
            onSelectionChange={(key) => setPriority(String(key) as TaskPriority | "todas")}
            className="w-[168px]"
          >
            <SelectItem id="todas">Toda prioridade</SelectItem>
            <SelectItem id="alta">Alta</SelectItem>
            <SelectItem id="media">Média</SelectItem>
            <SelectItem id="baixa">Baixa</SelectItem>
          </Select>
          <Select
            aria-label="Responsável"
            size="sm"
            selectedKey={assignee}
            onSelectionChange={(key) => setAssignee(String(key))}
            className="w-[200px]"
          >
            <SelectItem id="todos">Todos os responsáveis</SelectItem>
            {data.users.map((user) => (
              <SelectItem key={user.id} id={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => setOnlyMine((current) => !current)}
            aria-pressed={onlyMine}
            className={cx(
              "rounded-lg border px-2.5 py-1.5 text-caption-1-medium transition-colors",
              onlyMine
                ? "border-accent-400/40 bg-accent-500/12 text-accent-200"
                : "border-separator-border bg-background-secondary-default text-text-secondary hover:border-separator-border-strong",
            )}
          >
            Minhas tarefas
          </button>
        </div>
      </FilterBar>

      {tasks.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={RiSearchLine}
            title="Nenhuma tarefa neste filtro"
            description="Ajuste a busca e os filtros ou crie um novo próximo passo."
            action={
              <Button variant="secondary" size="small" onClick={() => setModalOpen(true)}>
                Criar tarefa
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <TaskBoard
          tasks={tasks}
          customers={data.customers}
          users={data.users}
          onMove={moveTask}
          onDefer={deferTask}
        />
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-separator-border bg-background-inner-default px-4 py-3 text-caption-1-regular text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <RiCalendarCheckLine className="size-3.5 text-chart-1" aria-hidden />
          {openTasks.filter((task) => daysUntil(task.dueDate) <= 7).length} tarefas nos próximos 7 dias
        </span>
        <span className="ms-auto">Tarefas criadas por agentes MCP aparecem com o selo correspondente.</span>
      </div>

      {modalOpen ? (
        <TaskModal
          isOpen={modalOpen}
          onOpenChange={setModalOpen}
          orgId={data.orgId}
          customers={data.customers}
          users={data.users}
          defaultAssigneeId={currentUser?.id}
        />
      ) : null}
    </div>
  );
}
