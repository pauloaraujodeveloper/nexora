import { useState } from "react";
import {
  RiArrowLeftLine,
  RiBuilding2Line,
  RiGroupLine,
  RiLoginBoxLine,
} from "@remixicon/react";
import { Badge } from "@/components/base/badges/badge";
import { Button } from "@/components/base/buttons/button";
import { Select, SelectItem } from "@/components/base/select/select";
import { toast } from "@/components/base/toast/toast";
import { PageHeader } from "@/components/nexora/page-header";
import { UserAvatar } from "@/components/nexora/misc";
import { roleLabel } from "@/lib/format";
import { navigate } from "@/lib/router";
import { useApp } from "@/lib/store";

export default function AdminPanel() {
  const { state, session, dispatch } = useApp();
  const [targetOrgId, setTargetOrgId] = useState(
    session?.orgId ?? state.orgs[0]?.id ?? "",
  );
  const [targetUserId, setTargetUserId] = useState("");

  const targetOrg = state.orgs.find((org) => org.id === targetOrgId);
  const orgUsers = state.users.filter((user) => user.orgId === targetOrgId);
  const activeUserId = orgUsers.some((user) => user.id === targetUserId && user.active)
    ? targetUserId
    : (orgUsers.find((user) => user.active)?.id ?? "");
  const targetUser = orgUsers.find((user) => user.id === activeUserId);

  function changeOrg(key: string) {
    setTargetOrgId(key);
    const first = state.users.find((user) => user.orgId === key && user.active);
    setTargetUserId(first?.id ?? "");
  }

  function enterAs() {
    if (!targetOrg || !targetUser) return;
    dispatch({ type: "switchOrg", orgId: targetOrg.id, userId: targetUser.id });
    toast.success("Sessão alterada", {
      description: `${targetUser.name} · ${targetOrg.name}`,
    });
    navigate("dashboard");
  }

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6">
      <PageHeader
        eyebrow="Administração"
        title="Visão interna"
        description="Organizações, usuários e troca rápida de contexto."
        actions={
          <Button
            variant="secondary"
            size="medium"
            leadingIcon={RiArrowLeftLine}
            onClick={() => navigate("dashboard")}
          >
            Voltar ao dashboard
          </Button>
        }
      />

      <section className="rounded-2xl border border-border-button-default bg-background-primary-default p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-background-secondary-default text-accent-300">
            <RiLoginBoxLine className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-title-3-semibold text-text-primary">Entrar como</h2>
            <p className="mt-0.5 text-body-2-regular text-text-secondary">
              Escolha uma organização e um perfil para abrir a sessão.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span id="admin-org-label" className="text-body-2-medium text-text-primary">
              Organização
            </span>
            <Select
              aria-labelledby="admin-org-label"
              selectedKey={targetOrgId}
              onSelectionChange={(key) => changeOrg(String(key))}
              className="w-full"
            >
              {state.orgs.map((org) => (
                <SelectItem key={org.id} id={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span id="admin-user-label" className="text-body-2-medium text-text-primary">
              Perfil
            </span>
            <Select
              aria-labelledby="admin-user-label"
              selectedKey={activeUserId}
              onSelectionChange={(key) => setTargetUserId(String(key))}
              className="w-full"
              isDisabled={orgUsers.length === 0}
            >
              {orgUsers.map((user) => (
                <SelectItem key={user.id} id={user.id}>
                  {user.name} · {roleLabel[user.role]}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="medium"
            leadingIcon={RiLoginBoxLine}
            onClick={enterAs}
            disabled={!targetUser}
          >
            Entrar como {targetUser ? targetUser.name.split(" ")[0] : "perfil"}
          </Button>
          <p className="text-caption-1-regular text-text-tertiary">
            A sessão mantém o papel de administrador.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-body-2-medium text-text-secondary">
          <RiBuilding2Line className="size-4 text-text-tertiary" aria-hidden />
          {state.orgs.length} organizações
        </span>
        <span className="flex items-center gap-2 text-body-2-medium text-text-secondary">
          <RiGroupLine className="size-4 text-text-tertiary" aria-hidden />
          {state.users.length} usuários
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {state.orgs.map((org) => {
          const users = state.users.filter((user) => user.orgId === org.id);
          const accounts = state.customers.filter(
            (customer) => customer.orgId === org.id && !customer.archived,
          ).length;

          return (
            <section
              key={org.id}
              className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default"
            >
              <header className="flex items-start justify-between gap-3 border-b border-separator-border p-4">
                <div className="min-w-0">
                  <h2 className="font-display text-title-3-semibold text-text-primary">
                    {org.name}
                  </h2>
                  <p className="mt-0.5 text-body-2-regular text-text-secondary">
                    Plano {org.plan} · {accounts} {accounts === 1 ? "conta" : "contas"}
                  </p>
                </div>
                <Badge color={org.status === "ativa" ? "primary" : "neutral"}>
                  {org.status}
                </Badge>
              </header>

              <ul className="divide-y divide-separator-border">
                {users.map((user) => (
                  <li key={user.id} className="flex items-center gap-2.5 px-4 py-3">
                    <UserAvatar user={user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-2-medium text-text-primary">{user.name}</p>
                      <p className="truncate text-caption-1-regular text-text-tertiary">
                        {user.email} · {roleLabel[user.role]}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setTargetOrgId(org.id);
                        setTargetUserId(user.id);
                      }}
                    >
                      Selecionar
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* UI-only guard: without a backend this role check is not real security. Production must validate admin access on the server. */}
      <p className="rounded-xl border border-separator-border bg-background-secondary-default px-3 py-2 text-caption-1-regular text-text-tertiary">
        A verificação de administrador é apenas de interface. Sem backend, ela não substitui
        autorização no servidor.
      </p>
    </div>
  );
}
