import { useMemo, useState } from "react";
import {
  RiAddLine,
  RiCheckboxCircleLine,
  RiFileCopyLine,
  RiHandCoinLine,
  RiKey2Line,
  RiMessage3Line,
  RiTaskLine,
  RiUserAddLine,
} from "@remixicon/react";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { Textarea } from "@/components/base/textarea/textarea";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Button } from "@/components/base/buttons/button";
import { toast } from "@/components/base/toast/toast";
import { useApp } from "@/lib/store";
import { uid } from "@/lib/format";
import type {
  Contact,
  Customer,
  Interaction,
  InteractionType,
  Opportunity,
  OpportunityStage,
  OpportunityType,
  Sentiment,
  Task,
  TaskPriority,
  TaskStatus,
  User,
} from "@/lib/types";
import { FormModal, ModalActions } from "./form-modal";
import { cx } from "@/utils/cx";

/* -------------------------------------------------------------------------- */
/* Contact                                                                    */
/* -------------------------------------------------------------------------- */

export function ContactModal({
  isOpen,
  onOpenChange,
  customer,
  orgId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  orgId: string;
}) {
  const { dispatch } = useApp();
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isDecisionMaker, setIsDecisionMaker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!name.trim() || !email.trim()) {
      setError("Nome e e-mail são obrigatórios.");
      return;
    }
    const contact: Contact = {
      id: uid("con"),
      orgId,
      customerId: customer.id,
      name: name.trim(),
      jobTitle: jobTitle.trim() || "Contato",
      email: email.trim(),
      phone: phone.trim(),
      isPrimary,
      isDecisionMaker,
    };
    dispatch({ type: "addContact", contact });
    toast.success("Contato adicionado", { description: `${contact.name} em ${customer.tradeName}.` });
    onOpenChange(false);
  }

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Novo contato"
      description={`Adicione uma pessoa à conta ${customer.tradeName}.`}
      icon={RiUserAddLine}
      size="md"
      footer={<ModalActions formId="contact-form" onCancel={() => onOpenChange(false)} submitLabel="Adicionar contato" />}
    >
      <form
        id="contact-form"
        className="space-y-3 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Input label="Nome" value={name} onChange={setName} isRequired placeholder="Ex.: Ana Souza" />
        <Input label="Cargo" value={jobTitle} onChange={setJobTitle} placeholder="Ex.: Diretora de Operações" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="E-mail" type="email" value={email} onChange={setEmail} isRequired placeholder="ana@empresa.com.br" />
          <Input label="Telefone" value={phone} onChange={setPhone} placeholder="(11) 99999-9999" />
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <Checkbox isSelected={isPrimary} onChange={setIsPrimary}>
            Contato principal
          </Checkbox>
          <Checkbox isSelected={isDecisionMaker} onChange={setIsDecisionMaker}>
            Tomador de decisão
          </Checkbox>
        </div>
        {error ? <p className="text-[12px] text-rose-300">{error}</p> : null}
      </form>
    </FormModal>
  );
}

/* -------------------------------------------------------------------------- */
/* Interaction                                                                */
/* -------------------------------------------------------------------------- */

export function InteractionModal({
  isOpen,
  onOpenChange,
  customer,
  orgId,
  authorId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  orgId: string;
  authorId: string;
}) {
  const { dispatch } = useApp();
  const [type, setType] = useState<InteractionType>("reuniao");
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment>("positivo");
  const [nextSteps, setNextSteps] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!subject.trim() || !summary.trim()) {
      setError("Assunto e resumo são obrigatórios.");
      return;
    }
    const interaction: Interaction = {
      id: uid("itc"),
      orgId,
      customerId: customer.id,
      type,
      occurredAt: new Date(occurredAt).toISOString(),
      subject: subject.trim(),
      summary: summary.trim(),
      sentiment,
      nextSteps: nextSteps.trim(),
      participants: [],
      createdBy: authorId,
      source: "ui",
    };
    dispatch({ type: "addInteraction", interaction });
    toast.success("Interação registrada", {
      description: "O health score e o histórico da conta foram atualizados.",
    });
    onOpenChange(false);
  }

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Registrar interação"
      description={`O que aconteceu com ${customer.tradeName}?`}
      icon={RiMessage3Line}
      size="lg"
      footer={<ModalActions formId="interaction-form" onCancel={() => onOpenChange(false)} submitLabel="Salvar interação" />}
    >
      <form
        id="interaction-form"
        className="space-y-3 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Tipo</span>
            <Select aria-label="Tipo" selectedKey={type} onSelectionChange={(key) => setType(String(key) as InteractionType)}>
              <SelectItem id="reuniao">Reunião</SelectItem>
              <SelectItem id="ligacao">Ligação</SelectItem>
              <SelectItem id="email">E-mail</SelectItem>
              <SelectItem id="mensagem">Mensagem</SelectItem>
              <SelectItem id="visita">Visita</SelectItem>
              <SelectItem id="nota">Nota</SelectItem>
            </Select>
          </div>
          <Input
            label="Quando"
            type="datetime-local"
            value={occurredAt}
            onChange={setOccurredAt}
            className="sm:col-span-1"
          />
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Sentimento</span>
            <Select
              aria-label="Sentimento"
              selectedKey={sentiment}
              onSelectionChange={(key) => setSentiment(String(key) as Sentiment)}
            >
              <SelectItem id="positivo">Positivo</SelectItem>
              <SelectItem id="neutro">Neutro</SelectItem>
              <SelectItem id="negativo">Negativo</SelectItem>
            </Select>
          </div>
        </div>
        <Input label="Assunto" value={subject} onChange={setSubject} isRequired placeholder="Ex.: Revisão trimestral de resultados" />
        <Textarea
          label="Resumo"
          value={summary}
          onChange={setSummary}
          isRequired
          rows={4}
          placeholder="Contexto, decisões e sinais percebidos…"
        />
        <Textarea
          label="Próximos passos"
          value={nextSteps}
          onChange={setNextSteps}
          rows={2}
          placeholder="Ex.: enviar plano de ação até sexta-feira"
        />
        {error ? <p className="text-[12px] text-rose-300">{error}</p> : null}
      </form>
    </FormModal>
  );
}

/* -------------------------------------------------------------------------- */
/* Task                                                                       */
/* -------------------------------------------------------------------------- */

export function TaskModal({
  isOpen,
  onOpenChange,
  orgId,
  customers,
  users,
  defaultCustomerId,
  defaultAssigneeId,
  defaultStatus = "aberta",
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  customers: Customer[];
  users: User[];
  defaultCustomerId?: string;
  defaultAssigneeId?: string;
  defaultStatus?: TaskStatus;
}) {
  const { dispatch } = useApp();
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId ?? users[0]?.id ?? "");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!title.trim()) {
      setError("Descreva a tarefa.");
      return;
    }
    const task: Task = {
      id: uid("tsk"),
      orgId,
      customerId: customerId || undefined,
      title: title.trim(),
      dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
      priority,
      status,
      assigneeId,
      createdAt: new Date().toISOString(),
      source: "ui",
    };
    dispatch({ type: "addTask", task });
    toast.success("Tarefa criada", { description: task.title });
    onOpenChange(false);
  }

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Nova tarefa"
      description="Defina o próximo passo e o responsável."
      icon={RiTaskLine}
      size="md"
      footer={<ModalActions formId="task-form" onCancel={() => onOpenChange(false)} submitLabel="Criar tarefa" />}
    >
      <form
        id="task-form"
        className="space-y-3 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Input label="Tarefa" value={title} onChange={setTitle} isRequired placeholder="Ex.: Enviar plano de ação" />
        <div className="flex flex-col gap-1">
          <span className="text-body-medium text-text-primary">Status</span>
          <Select
            aria-label="Status"
            selectedKey={status}
            onSelectionChange={(key) => setStatus(String(key) as TaskStatus)}
          >
            <SelectItem id="aberta">A fazer</SelectItem>
            <SelectItem id="em_andamento">Em andamento</SelectItem>
            <SelectItem id="concluida">Concluídas</SelectItem>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Conta</span>
            <Select aria-label="Conta" selectedKey={customerId} onSelectionChange={(key) => setCustomerId(String(key))}>
              {customers.map((customer) => (
                <SelectItem key={customer.id} id={customer.id}>
                  {customer.tradeName}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Responsável</span>
            <Select aria-label="Responsável" selectedKey={assigneeId} onSelectionChange={(key) => setAssigneeId(String(key))}>
              {users.map((user) => (
                <SelectItem key={user.id} id={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Prioridade</span>
            <Select
              aria-label="Prioridade"
              selectedKey={priority}
              onSelectionChange={(key) => setPriority(String(key) as TaskPriority)}
            >
              <SelectItem id="alta">Alta</SelectItem>
              <SelectItem id="media">Média</SelectItem>
              <SelectItem id="baixa">Baixa</SelectItem>
            </Select>
          </div>
          <Input label="Prazo" type="date" value={dueDate} onChange={setDueDate} />
        </div>
        {error ? <p className="text-[12px] text-rose-300">{error}</p> : null}
      </form>
    </FormModal>
  );
}

/* -------------------------------------------------------------------------- */
/* Opportunity                                                                */
/* -------------------------------------------------------------------------- */

export function OpportunityModal({
  isOpen,
  onOpenChange,
  orgId,
  customers,
  users,
  defaultCustomerId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  customers: Customer[];
  users: User[];
  defaultCustomerId?: string;
}) {
  const { dispatch } = useApp();
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");
  const [type, setType] = useState<OpportunityType>("upsell");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("12000");
  const [probability, setProbability] = useState("60");
  const [stage, setStage] = useState<OpportunityStage>("identificada");
  const [expectedClose, setExpectedClose] = useState(() => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  const [ownerId, setOwnerId] = useState(users[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!title.trim()) {
      setError("Dê um título para a oportunidade.");
      return;
    }
    const opportunity: Opportunity = {
      id: uid("opp"),
      orgId,
      customerId,
      type,
      title: title.trim(),
      value: Number(value) || 0,
      probability: Math.min(100, Math.max(0, Number(probability) || 0)),
      stage,
      expectedClose: new Date(`${expectedClose}T12:00:00`).toISOString(),
      ownerId,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "addOpportunity", opportunity });
    toast.success("Oportunidade criada", { description: opportunity.title });
    onOpenChange(false);
  }

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Nova oportunidade"
      description="Registre uma expansão, renovação ou indicação."
      icon={RiHandCoinLine}
      size="lg"
      footer={<ModalActions formId="opportunity-form" onCancel={() => onOpenChange(false)} submitLabel="Criar oportunidade" />}
    >
      <form
        id="opportunity-form"
        className="space-y-3 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Input label="Título" value={title} onChange={setTitle} isRequired placeholder="Ex.: Expansão para 120 assentos" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Conta</span>
            <Select aria-label="Conta" selectedKey={customerId} onSelectionChange={(key) => setCustomerId(String(key))}>
              {customers.map((customer) => (
                <SelectItem key={customer.id} id={customer.id}>
                  {customer.tradeName}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Tipo</span>
            <Select aria-label="Tipo" selectedKey={type} onSelectionChange={(key) => setType(String(key) as OpportunityType)}>
              <SelectItem id="upsell">Upsell</SelectItem>
              <SelectItem id="cross_sell">Cross-sell</SelectItem>
              <SelectItem id="renovacao">Renovação</SelectItem>
              <SelectItem id="indicacao">Indicação</SelectItem>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Valor (R$)" type="number" value={value} onChange={setValue} />
          <Input label="Probabilidade (%)" type="number" value={probability} onChange={setProbability} />
          <Input label="Fechamento esperado" type="date" value={expectedClose} onChange={setExpectedClose} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Estágio</span>
            <Select
              aria-label="Estágio"
              selectedKey={stage}
              onSelectionChange={(key) => setStage(String(key) as OpportunityStage)}
            >
              <SelectItem id="identificada">Identificada</SelectItem>
              <SelectItem id="em_conversa">Em conversa</SelectItem>
              <SelectItem id="proposta">Proposta</SelectItem>
              <SelectItem id="ganha">Ganha</SelectItem>
              <SelectItem id="perdida">Perdida</SelectItem>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Responsável</span>
            <Select aria-label="Responsável" selectedKey={ownerId} onSelectionChange={(key) => setOwnerId(String(key))}>
              {users.map((user) => (
                <SelectItem key={user.id} id={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
        {error ? <p className="text-[12px] text-rose-300">{error}</p> : null}
      </form>
    </FormModal>
  );
}

/* -------------------------------------------------------------------------- */
/* MCP token                                                                  */
/* -------------------------------------------------------------------------- */

export const MCP_SCOPES = [
  { id: "read:customers", label: "Ler clientes", description: "Listar contas, contatos e dados cadastrais." },
  { id: "read:interactions", label: "Ler interações", description: "Histórico de reuniões, e-mails e notas." },
  { id: "read:health", label: "Ler health score", description: "Score, componentes e fatores de risco." },
  { id: "read:dashboard", label: "Ler dashboard", description: "KPIs agregados e distribuições da carteira." },
  { id: "write:interactions", label: "Escrever interações", description: "Registrar interações em nome do usuário." },
  { id: "write:tasks", label: "Escrever tarefas", description: "Criar e atualizar próximos passos." },
];

export function TokenModal({
  isOpen,
  onOpenChange,
  orgId,
  userId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  userId: string;
}) {
  const { dispatch } = useApp();
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read:customers", "read:health", "read:dashboard"]);
  const [expiresIn, setExpiresIn] = useState("90");
  const [created, setCreated] = useState<string | null>(null);

  const fullToken = useMemo(() => {
    const random = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    return `nxr_${random}`;
  }, []);

  function toggleScope(id: string) {
    setScopes((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function submit() {
    if (!label.trim()) return;
    const expiresAt = new Date(Date.now() + Number(expiresIn) * 86_400_000).toISOString();
    dispatch({
      type: "addToken",
      token: {
        id: uid("tok"),
        orgId,
        userId,
        label: label.trim(),
        tokenPreview: `nxr_••••${fullToken.slice(-4)}`,
        scopes,
        expiresAt,
        createdAt: new Date().toISOString(),
      },
    });
    setCreated(fullToken);
  }

  if (created) {
    return (
      <FormModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title="Token criado"
        description="Copie agora. Por segurança, o token completo não será exibido novamente."
        icon={RiCheckboxCircleLine}
        size="md"
        footer={
          <Button size="medium" onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        }
      >
        <div className="space-y-3 py-2">
          <div className="nx-code flex items-center justify-between gap-2 p-3">
            <code className="truncate">{created}</code>
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiFileCopyLine}
              onClick={() => {
                navigator.clipboard?.writeText(created).catch(() => undefined);
                toast.success("Token copiado");
              }}
            >
              Copiar
            </Button>
          </div>
          <p className="text-[11.5px] leading-relaxed text-text-tertiary">
            Use este token no cabeçalho <code className="nx-kbd">Authorization: Bearer …</code> ao
            conectar um cliente MCP como Claude Desktop.
          </p>
        </div>
      </FormModal>
    );
  }

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Novo token MCP"
      description="Crie uma credencial com escopo mínimo para um agente ou integração."
      icon={RiKey2Line}
      size="lg"
      footer={
        <ModalActions
          formId="token-form"
          onCancel={() => onOpenChange(false)}
          submitLabel="Gerar token"
          disabled={!label.trim() || scopes.length === 0}
        />
      }
    >
      <form
        id="token-form"
        className="space-y-4 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Input label="Nome do token" value={label} onChange={setLabel} isRequired placeholder="Ex.: Claude · CS Ops" />
        <div className="flex flex-col gap-1">
          <span className="text-body-medium text-text-primary">Expira em</span>
          <Select aria-label="Expiração" selectedKey={expiresIn} onSelectionChange={(key) => setExpiresIn(String(key))}>
            <SelectItem id="30">30 dias</SelectItem>
            <SelectItem id="90">90 dias</SelectItem>
            <SelectItem id="180">180 dias</SelectItem>
            <SelectItem id="365">1 ano</SelectItem>
          </Select>
        </div>
        <div>
          <p className="mb-2 text-body-medium text-text-primary">Escopos</p>
          <div className="space-y-1.5">
            {MCP_SCOPES.map((scope) => {
              const checked = scopes.includes(scope.id);
              return (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => toggleScope(scope.id)}
                  className={cx(
                    "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors",
                    checked
                      ? "border-accent-400/40 bg-accent-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20",
                  )}
                  aria-pressed={checked}
                >
                  <span
                    className={cx(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded border",
                      checked ? "border-accent-400 bg-accent-500 text-white" : "border-white/20 text-transparent",
                    )}
                  >
                    <RiAddLine className={cx("size-3 transition-transform", checked ? "rotate-45" : "")} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-medium text-text-primary">{scope.label}</span>
                    <span className="block text-[10.5px] text-text-tertiary">{scope.description}</span>
                  </span>
                  <code className="ml-auto shrink-0 text-[9.5px] text-text-tertiary">{scope.id}</code>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </FormModal>
  );
}
