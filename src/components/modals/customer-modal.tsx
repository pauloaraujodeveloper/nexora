import { useState } from "react";
import { RiBuilding2Line } from "@remixicon/react";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { Textarea } from "@/components/base/textarea/textarea";
import { toast } from "@/components/base/toast/toast";
import { useApp } from "@/lib/store";
import { uid } from "@/lib/format";
import type { Customer, CustomerStatus, PaymentStatus, User } from "@/lib/types";
import { FormModal, ModalActions } from "./form-modal";
import { cx } from "@/utils/cx";

const SEGMENTS = [
  "Tecnologia",
  "Saúde",
  "Varejo",
  "Educação",
  "Logística",
  "Financeiro",
  "Indústria",
  "Serviços",
  "Agronegócio",
];

const PLANS = ["Starter", "Growth", "Business", "Enterprise"];

const COLORS = ["#5b6cff", "#22d3ee", "#e040fb", "#34d399", "#fbbf24", "#fb7185", "#a78bfa", "#60a5fa"];

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function CustomerModal({
  isOpen,
  onOpenChange,
  customer,
  orgId,
  users,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  orgId: string;
  users: User[];
}) {
  const { dispatch } = useApp();
  const editing = Boolean(customer);
  const [tradeName, setTradeName] = useState(customer?.tradeName ?? "");
  const [legalName, setLegalName] = useState(customer?.legalName ?? "");
  const [document, setDocument] = useState(customer?.document ?? "");
  const [segment, setSegment] = useState(customer?.segment ?? SEGMENTS[0]);
  const [size, setSize] = useState<Customer["size"]>(customer?.size ?? "media");
  const [plan, setPlan] = useState(customer?.plan ?? "Growth");
  const [mrr, setMrr] = useState(String(customer?.mrr ?? 4500));
  const [status, setStatus] = useState<CustomerStatus>(customer?.status ?? "onboarding");
  const [ownerId, setOwnerId] = useState(customer?.ownerId ?? users[0]?.id ?? "");
  const [city, setCity] = useState(customer?.city ?? "");
  const [stateUf, setStateUf] = useState(customer?.state ?? "SP");
  const [website, setWebsite] = useState(customer?.website ?? "");
  const [contractStart, setContractStart] = useState(toDateInput(customer?.contractStart ?? new Date().toISOString()));
  const [renewalDate, setRenewalDate] = useState(
    toDateInput(customer?.renewalDate ?? new Date(Date.now() + 365 * 86_400_000).toISOString()),
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(customer?.paymentStatus ?? "em_dia");
  const [nps, setNps] = useState(customer?.nps != null ? String(customer.nps) : "8");
  const [tags, setTags] = useState(customer?.tags.join(", ") ?? "");
  const [color, setColor] = useState(customer?.logoColor ?? COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!tradeName.trim()) {
      setError("Informe o nome fantasia da conta.");
      return;
    }
    if (!ownerId) {
      setError("Selecione um responsável.");
      return;
    }
    const now = new Date().toISOString();
    const payload: Customer = {
      id: customer?.id ?? uid("cus"),
      orgId,
      legalName: legalName.trim() || tradeName.trim(),
      tradeName: tradeName.trim(),
      document: document.trim() || "00.000.000/0001-00",
      segment,
      size,
      city: city.trim() || "São Paulo",
      state: stateUf,
      website: website.trim(),
      plan,
      mrr: Number(mrr) || 0,
      status,
      ownerId,
      contractStart: new Date(contractStart || now).toISOString(),
      renewalDate: new Date(renewalDate || now).toISOString(),
      canceledAt: status === "cancelado" ? customer?.canceledAt ?? now : undefined,
      cancelReason: status === "cancelado" ? customer?.cancelReason ?? "outro" : undefined,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      archived: customer?.archived ?? false,
      createdAt: customer?.createdAt ?? now,
      updatedAt: now,
      usageIndex: customer?.usageIndex ?? 45,
      openTickets: customer?.openTickets ?? 0,
      criticalTickets: customer?.criticalTickets ?? 0,
      paymentStatus,
      nps: nps === "" ? null : Math.min(10, Math.max(0, Number(nps))),
      lastContactAt: customer?.lastContactAt ?? null,
      logoColor: color,
    };

    if (editing) {
      dispatch({ type: "updateCustomer", id: payload.id, patch: payload });
      toast.success("Conta atualizada", { description: payload.tradeName });
    } else {
      dispatch({ type: "addCustomer", customer: payload });
      toast.success("Conta criada", { description: `${payload.tradeName} entrou no onboarding.` });
    }
    onOpenChange(false);
  }

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={editing ? "Editar conta" : "Nova conta"}
      description={
        editing
          ? "Atualize os dados cadastrais, financeiros e de relacionamento."
          : "Cadastre um cliente e inicie o acompanhamento de saúde e onboarding."
      }
      icon={RiBuilding2Line}
      size="xl"
      footer={
        <ModalActions
          formId="customer-form"
          onCancel={() => onOpenChange(false)}
          submitLabel={editing ? "Salvar alterações" : "Criar conta"}
        />
      }
    >
      <form
        id="customer-form"
        className="space-y-4 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Nome fantasia" value={tradeName} onChange={setTradeName} isRequired placeholder="Ex.: Alfa Logística" />
          <Input label="Razão social" value={legalName} onChange={setLegalName} placeholder="Ex.: Alfa Logística Ltda." />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="CNPJ" value={document} onChange={setDocument} placeholder="00.000.000/0001-00" />
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Segmento</span>
            <Select aria-label="Segmento" selectedKey={segment} onSelectionChange={(key) => setSegment(String(key))}>
              {SEGMENTS.map((item) => (
                <SelectItem key={item} id={item}>
                  {item}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Porte</span>
            <Select
              aria-label="Porte"
              selectedKey={size}
              onSelectionChange={(key) => setSize(String(key) as Customer["size"])}
            >
              <SelectItem id="micro">Micro</SelectItem>
              <SelectItem id="pequena">Pequena</SelectItem>
              <SelectItem id="media">Média</SelectItem>
              <SelectItem id="grande">Grande</SelectItem>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Plano</span>
            <Select aria-label="Plano" selectedKey={plan} onSelectionChange={(key) => setPlan(String(key))}>
              {PLANS.map((item) => (
                <SelectItem key={item} id={item}>
                  {item}
                </SelectItem>
              ))}
            </Select>
          </div>
          <Input label="MRR (R$)" type="number" value={mrr} onChange={setMrr} />
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Status</span>
            <Select
              aria-label="Status"
              selectedKey={status}
              onSelectionChange={(key) => setStatus(String(key) as CustomerStatus)}
            >
              <SelectItem id="onboarding">Onboarding</SelectItem>
              <SelectItem id="ativo">Ativo</SelectItem>
              <SelectItem id="em_risco">Em risco</SelectItem>
              <SelectItem id="cancelado">Cancelado</SelectItem>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
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
          <Input label="Cidade" value={city} onChange={setCity} placeholder="São Paulo" />
          <Input label="UF" value={stateUf} onChange={setStateUf} maxLength={2} placeholder="SP" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Site" value={website} onChange={setWebsite} placeholder="https://empresa.com.br" />
          <div className="flex flex-col gap-1">
            <span className="text-body-medium text-text-primary">Situação financeira</span>
            <Select
              aria-label="Situação financeira"
              selectedKey={paymentStatus}
              onSelectionChange={(key) => setPaymentStatus(String(key) as PaymentStatus)}
            >
              <SelectItem id="em_dia">Em dia</SelectItem>
              <SelectItem id="atraso_curto">Atraso curto</SelectItem>
              <SelectItem id="atraso_longo">Atraso longo</SelectItem>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Início do contrato" type="date" value={contractStart} onChange={setContractStart} />
          <Input label="Próxima renovação" type="date" value={renewalDate} onChange={setRenewalDate} />
          <Input label="NPS (0-10)" type="number" value={nps} onChange={setNps} />
        </div>

        <Textarea
          label="Tags"
          value={tags}
          onChange={setTags}
          placeholder="estratégico, expansão, indicação"
          hint="Separe as tags por vírgula."
          rows={2}
        />

        <div>
          <p className="mb-1.5 text-body-medium text-text-primary">Cor de identidade</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setColor(item)}
                aria-label={`Cor ${item}`}
                aria-pressed={color === item}
                className={cx(
                  "size-7 rounded-lg ring-2 transition-transform hover:scale-110",
                  color === item ? "ring-white" : "ring-transparent",
                )}
                style={{ background: item }}
              />
            ))}
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-200">
            {error}
          </p>
        ) : null}
      </form>
    </FormModal>
  );
}
