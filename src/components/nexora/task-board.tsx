import { useId, useState, type DragEvent } from "react";
import {
  RiAddLine,
  RiCheckLine,
  RiCheckboxMultipleLine,
  RiCloseLine,
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
  /** Moves a task and persists the column order (`orderedIds`, first to last). */
  onDropTask: (task: Task, status: TaskStatus, orderedIds: string[]) => void;
  onDefer: (task: Task) => void;
  onCreate: (status: TaskStatus) => void;
  onAddSubtask: (task: Task, title: string) => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
  onRemoveSubtask: (task: Task, subtaskId: string) => void;
};

function sortColumn(tasks: Task[], status: TaskStatus) {
  return tasks
    .filter((task) => task.status === status)
    .sort(
      (a, b) =>
        (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
        +new Date(a.dueDate) - +new Date(b.dueDate),
    );
}

/**
 * Kanban board for tasks. Cards can be dragged between columns (status) and
 * reordered inside a column; both moves persist through the store. Every card
 * also exposes the same actions through a menu and each column has its own
 * "new task" button, so touch and keyboard users get the full flow without
 * dragging.
 */
export function TaskBoard({
  tasks,
  customers,
  users,
  onDropTask,
  onDefer,
  onCreate,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
}: TaskBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; before: boolean } | null>(null);

  function resetDrag() {
    setDraggingId(null);
    setOverColumn(null);
    setDropTarget(null);
  }

  function dropOnCard(target: Task, before: boolean) {
    const dragged = draggingId ? tasks.find((item) => item.id === draggingId) : null;
    resetDrag();
    if (!dragged || dragged.id === target.id) return;
    const ids = sortColumn(tasks, target.status)
      .map((item) => item.id)
      .filter((id) => id !== dragged.id);
    const index = ids.indexOf(target.id);
    ids.splice(index < 0 ? ids.length : index + (before ? 0 : 1), 0, dragged.id);
    onDropTask(dragged, target.status, ids);
  }

  function dropOnColumn(status: TaskStatus) {
    const dragged = draggingId ? tasks.find((item) => item.id === draggingId) : null;
    resetDrag();
    if (!dragged) return;
    const ids = sortColumn(tasks, status)
      .map((item) => item.id)
      .filter((id) => id !== dragged.id);
    ids.push(dragged.id);
    onDropTask(dragged, status, ids);
  }

  function moveToColumn(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    const ids = sortColumn(tasks, status)
      .map((item) => item.id)
      .filter((id) => id !== task.id);
    ids.push(task.id);
    onDropTask(task, status, ids);
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 px-0.5 text-caption-1-regular text-text-tertiary">
        <RiDraggable className="size-3.5 shrink-0" aria-hidden />
        Arraste os cartões entre as colunas ou use o menu ⋯ para mudar o status.
      </p>

      <div className="grid items-start gap-3 md:grid-cols-3">
        {TASK_COLUMNS.map((column) => {
          const items = sortColumn(tasks, column.id);
          const isOver = draggingId !== null && overColumn === column.id;

          return (
            <section
              key={column.id}
              aria-label={`${column.label} (${items.length})`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (overColumn !== column.id) setOverColumn(column.id);
                if (dropTarget) setDropTarget(null);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setOverColumn((current) => (current === column.id ? null : current));
                  setDropTarget(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                dropOnColumn(column.id);
              }}
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
                <button
                  type="button"
                  onClick={() => onCreate(column.id)}
                  aria-label={`Nova tarefa em ${column.label}`}
                  className="grid size-6 shrink-0 place-items-center rounded-md text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none"
                >
                  <RiAddLine className="size-4" aria-hidden />
                </button>
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
                    <li key={task.id} className="relative">
                      {dropTarget?.id === task.id ? (
                        <span
                          aria-hidden
                          className={cx(
                            "pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-accent-400",
                            dropTarget.before ? "-top-1" : "-bottom-1",
                          )}
                        />
                      ) : null}
                      <TaskCard
                        task={task}
                        customer={customers.find((item) => item.id === task.customerId)}
                        owner={users.find((item) => item.id === task.assigneeId)}
                        dragging={draggingId === task.id}
                        onDragStart={() => setDraggingId(task.id)}
                        onDragEnd={resetDrag}
                        onDragOverCard={(event) => {
                          if (!draggingId || draggingId === task.id) return;
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = "move";
                          const rect = event.currentTarget.getBoundingClientRect();
                          const before = event.clientY < rect.top + rect.height / 2;
                          setOverColumn(task.status);
                          setDropTarget((current) =>
                            current?.id === task.id && current.before === before
                              ? current
                              : { id: task.id, before },
                          );
                        }}
                        onDragLeaveCard={() =>
                          setDropTarget((current) => (current?.id === task.id ? null : current))
                        }
                        onDropCard={(before) => dropOnCard(task, before)}
                        onMoveToColumn={moveToColumn}
                        onDefer={onDefer}
                        onAddSubtask={onAddSubtask}
                        onToggleSubtask={onToggleSubtask}
                        onRemoveSubtask={onRemoveSubtask}
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
  onDragOverCard,
  onDragLeaveCard,
  onDropCard,
  onMoveToColumn,
  onDefer,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
}: {
  task: Task;
  customer?: Customer;
  owner?: User;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverCard: (event: DragEvent<HTMLElement>) => void;
  onDragLeaveCard: () => void;
  onDropCard: (before: boolean) => void;
  onMoveToColumn: (task: Task, status: TaskStatus) => void;
  onDefer: (task: Task) => void;
  onAddSubtask: (task: Task, title: string) => void;
  onToggleSubtask: (task: Task, subtaskId: string) => void;
  onRemoveSubtask: (task: Task, subtaskId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [dragLocked, setDragLocked] = useState(false);
  const subtasksId = useId();

  const done = task.status === "concluida";
  const overdue = !done && daysUntil(task.dueDate) < 0;
  const subtasks = task.subtasks ?? [];
  const doneSubtasks = subtasks.filter((subtask) => subtask.done).length;

  function submitSubtask() {
    const title = draft.trim();
    if (!title) return;
    onAddSubtask(task, title);
    setDraft("");
  }

  return (
    <article
      draggable={!dragLocked}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverCard}
      onDragLeave={onDragLeaveCard}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        onDropCard(event.clientY < rect.top + rect.height / 2);
      }}
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
                      onMoveToColumn(task, column.id);
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
        <div className="flex min-w-0 items-center gap-2">
          <OwnerChip user={owner} compact />
          <button
            type="button"
            onClick={() => setSubtasksOpen((current) => !current)}
            aria-expanded={subtasksOpen}
            aria-controls={subtasksId}
            aria-label={`Subtarefas de ${task.title}`}
            className={cx(
              "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-caption-2-medium transition-colors",
              "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none",
              subtasks.length
                ? "bg-background-secondary-default text-text-secondary hover:text-text-primary"
                : "text-text-tertiary hover:text-text-secondary",
            )}
          >
            <RiCheckboxMultipleLine className="size-3.5" aria-hidden />
            {subtasks.length ? `${doneSubtasks}/${subtasks.length}` : "Subtarefas"}
          </button>
        </div>
        <span
          className={cx(
            "text-caption-2-medium",
            overdue ? "text-text-error-primary" : "text-text-tertiary",
          )}
        >
          {formatDate(task.dueDate)}
        </span>
      </div>

      {subtasksOpen ? (
        <div id={subtasksId} className="mt-2 space-y-1.5 border-t border-separator-border pt-2">
          {subtasks.length ? (
            <ul className="space-y-1">
              {subtasks.map((subtask) => (
                <li key={subtask.id} className="group/sub flex items-start gap-1.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={subtask.done}
                    aria-label={`${subtask.done ? "Reabrir" : "Concluir"} subtarefa ${subtask.title}`}
                    onClick={() => onToggleSubtask(task, subtask.id)}
                    className={cx(
                      "mt-0.5 grid size-3.5 shrink-0 place-items-center rounded border transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none",
                      subtask.done
                        ? "border-state-success-base bg-state-success-base/20 text-state-success-text"
                        : "border-border-checkbox-default text-transparent hover:border-state-success-base hover:text-state-success-text",
                    )}
                  >
                    <RiCheckLine className="size-2.5" aria-hidden />
                  </button>
                  <span
                    className={cx(
                      "min-w-0 flex-1 text-caption-1-regular",
                      subtask.done ? "text-text-tertiary line-through" : "text-text-secondary",
                    )}
                  >
                    {subtask.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveSubtask(task, subtask.id)}
                    aria-label={`Remover subtarefa ${subtask.title}`}
                    className="grid size-4 shrink-0 place-items-center rounded text-text-tertiary opacity-0 transition-opacity hover:text-text-error-primary focus-visible:opacity-100 group-hover/sub:opacity-100"
                  >
                    <RiCloseLine className="size-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-caption-2-regular text-text-tertiary">Nenhuma subtarefa ainda.</p>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitSubtask();
            }}
            className="flex items-center gap-1.5"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={() => setDragLocked(true)}
              onBlur={() => setDragLocked(false)}
              placeholder="Adicionar subtarefa"
              aria-label={`Nova subtarefa de ${task.title}`}
              className="min-w-0 flex-1 rounded-md border border-separator-border bg-background-secondary-default px-2 py-1 text-caption-1-regular text-text-primary placeholder:text-text-placeholder focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Adicionar subtarefa"
              className="grid size-6 shrink-0 place-items-center rounded-md border border-separator-border text-text-secondary transition-colors hover:border-separator-border-strong hover:text-text-primary disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none"
            >
              <RiAddLine className="size-3.5" aria-hidden />
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
