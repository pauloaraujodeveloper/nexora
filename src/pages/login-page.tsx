import { useState } from "react";
import {
  RiArrowRightLine,
  RiCheckLine,
  RiFlashlightLine,
  RiLock2Line,
  RiMailLine,
  RiShieldCheckLine,
  RiSparklingLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import { NexoraMark } from "@/components/nexora/brand";
import { useApp } from "@/lib/store";
import { useBouncyLogo, useMotionEnabled } from "@/lib/motion";
import { cx } from "@/utils/cx";
import { DEMO_ORGS } from "@/lib/seed";
import { roleLabel } from "@/lib/format";
import { UserAvatar } from "@/components/nexora/misc";

const HIGHLIGHTS = [
  "Health score explicável, com seis dimensões e histórico de 12 meses.",
  "Onboarding, oportunidades, riscos e tarefas em um único lugar.",
  "MCP nativo para Claude e agentes de IA operarem com escopo e auditoria.",
];

export function LoginPage() {
  const { state, dispatch } = useApp();
  const [orgId, setOrgId] = useState(DEMO_ORGS[0].id);
  const [userId, setUserId] = useState("usr_rafael");
  const [email, setEmail] = useState("rafael@orbita.com.br");
  const [password, setPassword] = useState("nexora-demo");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const settings = state.settings[orgId];
  const motion = useMotionEnabled(settings?.reduceMotion);
  const logoRef = useBouncyLogo(motion);

  const orgUsers = state.users.filter((user) => user.orgId === orgId && user.active);
  const selectedUser = state.users.find((user) => user.id === userId) ?? orgUsers[0];

  function chooseOrg(nextOrgId: string) {
    setOrgId(nextOrgId);
    const first = state.users.find((user) => user.orgId === nextOrgId && user.active);
    if (first) {
      setUserId(first.id);
      setEmail(first.email);
    }
    setError(null);
  }

  function chooseUser(nextUserId: string) {
    setUserId(nextUserId);
    const user = state.users.find((item) => item.id === nextUserId);
    if (user) setEmail(user.email);
    setError(null);
  }

  function signIn() {
    if (!selectedUser) {
      setError("Selecione um perfil de demonstração.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError("Informe e-mail e senha para continuar.");
      return;
    }
    dispatch({
      type: "login",
      session: { userId: selectedUser.id, orgId, at: new Date().toISOString() },
    });
    window.location.hash = "#/dashboard";
  }

  return (
    <div className="nexora-shell relative flex min-h-dvh flex-col overflow-hidden">
      <div className="nexora-grid" aria-hidden />
      <div className="nexora-aurora" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <span className="flex items-center gap-2.5">
          <NexoraMark size={34} />
          <span className="font-display text-[15px] font-extrabold tracking-[0.2em] text-text-primary">
            NEXORA
          </span>
        </span>
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* ---------------------------------------------------------- story */}
        <section className="hidden flex-col justify-center lg:flex">
          <div className="relative mb-8 h-[172px] w-[172px]">
            <span
              aria-hidden
              className="nx-spin-slow absolute inset-0 rounded-[34%] border border-dashed border-white/10"
            />
            <span
              aria-hidden
              className="absolute -inset-5 rounded-[38%] bg-[radial-gradient(circle,rgba(124,140,255,0.24),transparent_66%)] blur-xl"
            />
            <div
              ref={logoRef}
              className="relative grid h-[172px] w-[172px] cursor-grab place-items-center active:cursor-grabbing"
              title="Arraste a marca Nexora"
            >
              <NexoraMark size={132} className="shadow-[0_28px_80px_-20px_rgba(34,211,238,0.45)]" />
            </div>
          </div>

          <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-text-secondary uppercase">
            <RiSparklingLine className="size-3.5 text-brand-cyan" aria-hidden />
            Customer Intelligence Platform
          </p>
          <h1 className="max-w-[520px] font-display text-[42px] leading-[1.06] font-extrabold text-text-primary">
            Conexões inteligentes.
            <br />
            <span className="brand-gradient-text">Clientes que crescem.</span>
          </h1>
          <p className="mt-4 max-w-[460px] text-[14px] leading-relaxed text-text-secondary">
            Uma visão viva de cada conta: saúde, relacionamento, implantação e expansão —
            com IA conectada ao contexto do seu time.
          </p>

          <ul className="mt-7 space-y-2.5">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
                  <RiCheckLine className="size-3" aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
            <RiShieldCheckLine className="size-5 shrink-0 text-brand-cyan" aria-hidden />
            <p className="text-[11.5px] leading-relaxed text-text-tertiary">
              Ambiente de demonstração. Dados fictícios, multi-tenant e persistidos apenas
              no seu navegador.
            </p>
          </div>
        </section>

        {/* ----------------------------------------------------------- form */}
        <section className="mx-auto w-full max-w-[440px]">
          <div className="nx-login-card rounded-3xl p-5 sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[22px] font-bold text-text-primary">Entrar na plataforma</h2>
                <p className="mt-1 text-[12.5px] text-text-secondary">
                  Escolha uma organização e um perfil de demonstração.
                </p>
              </div>
              <span className="hidden rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold tracking-wider text-text-tertiary uppercase sm:block">
                Demo
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.1em] text-text-tertiary uppercase">
                Organização
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {DEMO_ORGS.map((org) => {
                  const active = org.id === orgId;
                  const count = state.customers.filter((customer) => customer.orgId === org.id).length;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => chooseOrg(org.id)}
                      aria-pressed={active}
                      className={cx(
                        "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
                        active
                          ? "border-accent-400/60 bg-accent-500/10 shadow-[0_0_0_1px_rgba(124,140,255,0.35),0_14px_40px_-24px_rgba(91,108,255,0.9)]"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-[12.5px] font-semibold text-text-primary">{org.name}</span>
                        {active && <RiCheckLine className="size-4 text-accent-300" aria-hidden />}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-text-tertiary">
                        Plano {org.plan} · {count} contas
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.1em] text-text-tertiary uppercase">
                Perfil
              </p>
              <div className="flex flex-wrap gap-1.5">
                {orgUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => chooseUser(user.id)}
                    aria-pressed={user.id === userId}
                    className={cx(
                      "flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-[11.5px] transition-colors",
                      user.id === userId
                        ? "border-accent-400/50 bg-accent-500/12 text-text-primary"
                        : "border-white/10 bg-white/[0.02] text-text-secondary hover:border-white/20",
                    )}
                    title={`${user.name} · ${roleLabel[user.role]}`}
                  >
                    <UserAvatar user={user} size="xs" />
                    {user.name.split(" ")[0]}
                  </button>
                ))}
              </div>
              {selectedUser ? (
                <p className="text-[11px] text-text-tertiary">
                  {selectedUser.title} · {roleLabel[selectedUser.role]}
                </p>
              ) : null}
            </div>

            <form
              className="mt-5 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                signIn();
              }}
            >
              <Input
                label="E-mail corporativo"
                type="email"
                value={email}
                onChange={setEmail}
                leadingIcon={RiMailLine}
                autoComplete="email"
                placeholder="voce@empresa.com.br"
              />
              <Input
                label="Senha"
                type="password"
                value={password}
                onChange={setPassword}
                leadingIcon={RiLock2Line}
                autoComplete="current-password"
                placeholder="••••••••"
              />

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <Checkbox isSelected={remember} onChange={setRemember} size="sm">
                  Manter conectado
                </Checkbox>
                <button
                  type="button"
                  className="text-[11.5px] font-medium text-accent-300 hover:text-accent-200"
                  onClick={() => setPassword("nexora-demo")}
                >
                  Usar senha demo
                </button>
              </div>

              {error ? (
                <p role="alert" className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-200">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                size="medium"
                className="w-full bg-gradient-to-r from-brand-blue via-accent-600 to-brand-violet shadow-[0_16px_40px_-18px_rgba(91,108,255,0.95)]"
                trailingIcon={RiArrowRightLine}
              >
                Entrar na demonstração
              </Button>
            </form>

            <p className="mt-4 flex items-center gap-1.5 text-[10.5px] leading-relaxed text-text-tertiary">
              <RiFlashlightLine className="size-3.5 shrink-0 text-brand-cyan" aria-hidden />
              Acesso livre: qualquer senha funciona neste ambiente de demonstração.
            </p>
          </div>

          <p className="mt-4 text-center text-[10.5px] text-text-tertiary">
            © {new Date().getFullYear()} Nexora · Feito para times de Customer Success
          </p>
        </section>
      </main>
    </div>
  );
}
