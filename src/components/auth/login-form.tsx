import { useState, type FormEvent } from "react";
import { RiArrowRightLine, RiLock2Line, RiMailLine } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Spinner } from "@/components/base/spinner/spinner";
import { cx } from "@/utils/cx";

type Feedback = { tone: "error" | "info"; text: string };

export type LoginFormValues = { email: string; password: string };

type LoginFormProps = {
  onSubmit: (values: LoginFormValues) => string | null;
};

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setFeedback({ tone: "error", text: "Informe e-mail e senha para continuar." });
      return;
    }

    setSubmitting(true);
    const error = onSubmit({ email: email.trim(), password });
    if (error) {
      setSubmitting(false);
      setFeedback({ tone: "error", text: error });
    }
  }

  function handleForgotPassword() {
    setFeedback({
      tone: "info",
      text: "A recuperação de senha é feita pelo administrador da sua organização.",
    });
  }

  const emailInvalid = feedback?.tone === "error" && !email.trim();
  const passwordInvalid = feedback?.tone === "error" && !password;

  return (
    <form className="space-y-3" onSubmit={handleSubmit} noValidate>
      <Input
        label="E-mail"
        type="email"
        value={email}
        onChange={(value) => {
          setEmail(value);
          if (feedback?.tone === "error") setFeedback(null);
        }}
        leadingIcon={RiMailLine}
        autoComplete="email"
        placeholder="voce@empresa.com.br"
        isRequired
        isInvalid={emailInvalid}
      />
      <Input
        label="Senha"
        type="password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          if (feedback?.tone === "error") setFeedback(null);
        }}
        leadingIcon={RiLock2Line}
        autoComplete="current-password"
        placeholder="••••••••"
        isRequired
        isInvalid={passwordInvalid}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleForgotPassword}
          className="rounded-md text-body-2-medium text-accent-600 transition-colors duration-150 ease-out hover:text-accent-700 focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none dark:text-accent-300 dark:hover:text-accent-200"
        >
          Esqueci minha senha
        </button>
      </div>

      <div aria-live="polite" aria-atomic="true" className="min-h-5">
        {feedback ? (
          <p
            role={feedback.tone === "error" ? "alert" : "status"}
            className={cx(
              "rounded-lg border px-3 py-2 text-caption-1-regular transition-opacity duration-200 ease-out",
              feedback.tone === "error"
                ? "border-border-error-default bg-background-tertiary-error text-text-error-primary"
                : "border-separator-border bg-background-secondary-default text-text-secondary",
            )}
          >
            {feedback.text}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="medium"
        className="w-full"
        disabled={submitting}
        trailingIcon={submitting ? undefined : RiArrowRightLine}
      >
        {submitting ? (
          <span className="inline-flex items-center gap-1.5">
            <Spinner size="sm" aria-hidden className="text-white" />
            Entrando…
          </span>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  );
}
