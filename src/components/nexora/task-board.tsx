import { useState, type DragEvent } from "react";
import {
  RiCheckLine,
  RiDraggable,
  RiMore2Line,
  RiTimeLine,
} from "@remixicon/react";
import {
  Dropdown,
  DropdownDivider,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/components/base/dropdown/dropdown";
import { PriorityPill } from "@/components/nexora/status-pill";
import { OwnerChip, Tag } from "@/components/nexora/misc";
import { daysUntil, formatDate, relativeFuture } from "@/lib/format";
import { navigate } from "@/lib/router";
import type { Customer, Task, TaskStatus, User } from "@/lib/types";
import { cx } from "@/utils/cx";

const TASK_COLUMNS: { id: TaskStatus; label: string; hint: string; dot: string }[] = [
  { id: "aberta", label: "A fazer", hint: "Aguardando início", dot: "bg-chart-1" },
  { id: "em_andamento", label: "Em andamento", hint: "Em execução", dot: "bg-chart-8" },
  { id: "concluida", label: "Concluídas", hint: "Histórico", dot: "bg-chart-2" },
];

type TaskBoardProps = {
  tasks: Task[];
  customers: Customer[];
  users: User[];
  onMove: (task: Task, status: TaskStatus) => void;
  onDefer: (task: Task) => void;
};

/**
 * Kanban board for tasks. Cards are moved between the three status columns
 * with native drag and drop; every card also exposes the same moves through a
 * menu so touch and keyboard users can change status without dragging.
 */
export function TaskBoard({ tasks, customers, users, onMove, onDefer }: TaskBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  function handleDrop(status: TaskStatus, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    setOverColumn(null);
    setDraggingId(null);
    const task = tasks.find((item) => item.id === id);
    if (task && task.status !== status) onMove(task, status);
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 px-0.5 text-caption-1-regular text-text-tertiary">
        <RiDraggable className="size-3.5 shrink-0" aria-hidden />
        Arraste os cartões entre as colunas ou use o menu ⋯ para mudar o status.
      </p>

      <div className="grid items-start gap-3 md:grid-cols-3">
        {TASK_COLUMNS.map((column) => {
          const items = tasks.filter((task) => task.status === column.id);
          const isOver = draggingId !== null && overColumn === column.id;

          return (
            <section
              key={column.id}
              aria-label={`${column.label} (${items.length})`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (overColumn !== column.id) setOverColumn(column.id);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setOverColumn((current) => (current === column.id ? null : current));
                }
              }}
              onDrop={(event) => handleDrop(column.id, event)}
              className={cx(
                "flex min-h-[220px] flex-col gap-2 rounded-2xl border p-2.5 transition-colors duration-150",
                isOver
                  ? "border-accent-400/60 bg-accent-500/[0.06]"
                  : "border-separator-border bg-background-secondary-default",
              )}
            >
              <header className="flex items-center gap-2 px-0.5">
                <span className={cx("size-2 shrink-0 rounded-full", column.dot)} aria-hidden />
                <h3 className="text-body-2-semibold text-text-primary">{column.label}</h3>
                <span className="rounded-md bg-background-tertiary-default px-1.5 py-0.5 text-caption-2-semibold text-text-secondary tabular-nums">
                  {items.length}
                </span>
                <span className="ms-auto hidden text-caption-2-regular text-text-tertiary sm:block">
                  {column.hint}
                </span>
              </header>

              {items.length === 0 ? (
                <div
                  className={cx(
                    "grid min-h-24 flex-1 place-items-center rounded-xl border border-dashed px-3 py-6 text-center text-caption-1-regular",
                    isOver
                      ? "border-accent-400/60 text-accent-200"
                      : "border-separator-border-strong text-text-tertiary",
                  )}
                >
                  {isOver ? "Solte a tarefa aqui" : "Nenhuma tarefa nesta etapa"}
                </div>
              ) : (
                <ul className="flex flex-1 flex-col gap-2">
                  {items.map((task) => (
                    <li key={task.id}>
                      <TaskCard
                        task={task}
                        customer={customers.find((item) => item.id === task.customerId)}
                        owner={users.find((item) => item.id === task.assigneeId)}
                        dragging={draggingId === task.id}
                        onDragStart={() => setDraggingId(task.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverColumn(null);
                        }}
                        onMove={onMove}
                        onDefer={onDefer}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  customer,
  owner,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onDefer,
}: {
  task: Task;
  customer?: Customer;
  owner?: User;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (task: Task, status: TaskStatus) => void;
  onDefer: (task: Task) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const done = task.status === "concluida";
  const overdue = !done && daysUntil(task.dueDate) < 0;

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cx(
        "group cursor-grab rounded-xl border border-border-button-default bg-background-primary-default p-2.5",
        "transition-[opacity,border-color] duration-150 hover:border-border-button-hover active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-1.5">
        <PriorityPill priority={task.priority} />
        {task.source === "mcp" ? <Tag>via MCP</Tag> : null}
        {task.source === "playbook" ? <Tag>playbook</Tag> : null}

        <div className="-me-1 -mt-1 ms-auto">
          <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownTrigger
              aria-label={`Mover ou adiar: ${task.title}`}
              className="grid size-6 place-items-center rounded-md text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none"
            >
              <RiMore2Line className="size-4" aria-hidden />
            </DropdownTrigger>
            <DropdownPopover aria-label={`Ações da tarefa ${task.title}`} className="w-[228px]">
              <DropdownGroup label="Mover para">
                {TASK_COLUMNS.map((column) => (
                  <DropdownItem
                    key={column.id}
                    selected={task.status === column.id}
                    onSelect={() => {
                      setMenuOpen(false);
                      onMove(task, column.id);
                    }}
                  >
                    <span className={cx("size-2 shrink-0 rounded-full", column.dot)} aria-hidden />
                    <span className="flex-1 text-body-2-medium text-text-primary">{column.label}</span>
                    {task.status === column.id ? (
                      <RiCheckLine className="size-3.5 text-accent-300" aria-hidden />
                    ) : null}
                  </DropdownItem>
                ))}
              </DropdownGroup>
              <DropdownDivider />
              <DropdownItem
                onSelect={() => {
                  setMenuOpen(false);
                  onDefer(task);
                }}
              >
                <RiTimeLine className="size-4 shrink-0 text-text-tertiary" aria-hidden />
                <span className="flex-1 text-body-2-medium text-text-primary">Adiar 7 dias</span>
              </DropdownItem>
            </DropdownPopover>
          </Dropdown>
        </div>
      </div>

      <p
        className={cx(
          "mt-1.5 text-body-2-medium",
          done ? "text-text-tertiary line-through" : "text-text-primary",
        )}
      >
        {task.title}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption-2-regular text-text-tertiary">
        {customer ? (
          <button
            type="button"
            onClick={() => navigate(`clientes/${customer.id}?tab=interacoes`)}
            className="max-w-full truncate text-start transition-colors hover:text-accent-200"
          >
            {customer.tradeName}
          </button>
        ) : (
          <span>Sem conta</span>
        )}
        <span aria-hidden>·</span>
        <span className={cx(overdue && "text-text-error-primary")}>{relativeFuture(task.dueDate)}</span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <OwnerChip user={owner} compact />
        <span
          className={cx(
            "text-caption-2-medium",
            overdue ? "text-text-error-primary" : "text-text-tertiary",
          )}
        >
          {formatDate(task.dueDate)}
        </span>
      </div>
    </article>
  );
}
