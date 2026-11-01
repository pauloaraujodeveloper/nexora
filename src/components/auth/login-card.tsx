import type { ReactNode } from "react";

export function LoginCard({ children }: { children: ReactNode }) {
  return (
    <section className="nx-login-enter w-full rounded-3xl border border-border-button-default bg-background-primary-default/95 p-5 shadow-2xl backdrop-blur sm:p-7">
      <header className="flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center overflow-hidden rounded-2xl border border-separator-border bg-background-secondary-default">
          <img
            src="/nexora-mark-128.png"
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
        </span>
        <span className="mt-3 font-display text-[15px] font-extrabold tracking-[0.2em] text-text-primary">
          NEXORA
        </span>
        <span className="mt-0.5 text-[10px] font-medium tracking-[0.18em] text-text-tertiary uppercase">
          Customer Intelligence
        </span>
      </header>

      <div className="mt-6 text-center">
        <h1 className="font-display text-title-2-semibold text-text-primary">Entrar no Nexora</h1>
        <p className="mt-1.5 text-body-2-regular text-text-secondary">
          Acesse a visão de clientes do seu time.
        </p>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}
