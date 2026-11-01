import { useCallback, useEffect, useState } from "react";
import { Divider } from "@/components/base/divider/divider";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginCard } from "@/components/auth/login-card";
import { LoginForm, type LoginFormValues } from "@/components/auth/login-form";
import { isAdminEmail } from "@/lib/admin";
import type { GoogleProfile } from "@/lib/google";
import { navigate } from "@/lib/router";
import { buildSession } from "@/lib/session";
import { useApp } from "@/lib/store";
import type { SessionRole } from "@/lib/types";

function roleFor(email: string): SessionRole {
  return isAdminEmail(email) ? "admin" : "member";
}

const CURRENT_YEAR = new Date().getFullYear();

export function LoginPage() {
  const { state, dispatch } = useApp();
  const [googleFeedback, setGoogleFeedback] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Entrar · Nexora";
  }, []);

  const signInWithGoogle = useCallback(
    (profile: GoogleProfile) => {
      const session = buildSession({
        users: state.users,
        orgs: state.orgs,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        role: roleFor(profile.email),
      });

      if (!session) {
        setGoogleFeedback("Nenhuma organização disponível para entrar.");
        return;
      }

      dispatch({ type: "login", session });
      navigate("dashboard");
    },
    [dispatch, state.orgs, state.users],
  );

  function signInWithEmail({ email }: LoginFormValues): string | null {
    const session = buildSession({
      users: state.users,
      orgs: state.orgs,
      email,
      role: roleFor(email),
    });

    if (!session) return "Nenhuma organização disponível para entrar.";

    dispatch({ type: "login", session });
    navigate("dashboard");
    return null;
  }

  return (
    <div className="nexora-shell relative flex min-h-dvh flex-col overflow-hidden">
      <div className="nexora-grid" aria-hidden />
      <div className="nexora-aurora" aria-hidden />

      <header className="relative z-10 flex justify-end px-5 py-5 sm:px-8">
        <ThemeToggle collapsed />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-10">
        <div className="w-full max-w-[420px]">
          <LoginCard>
            <GoogleButton
              onProfile={signInWithGoogle}
              onError={setGoogleFeedback}
            />

            <div aria-live="polite" aria-atomic="true" className="min-h-5">
              {googleFeedback ? (
                <p className="nx-fade-in mt-2 rounded-lg border border-border-error-default bg-background-tertiary-error px-3 py-2 text-caption-1-regular text-text-error-primary">
                  {googleFeedback}
                </p>
              ) : null}
            </div>

            <div className="my-5">
              <Divider>ou</Divider>
            </div>

            <LoginForm onSubmit={signInWithEmail} />
          </LoginCard>

          <p className="mt-4 text-center text-caption-1-regular text-text-tertiary">
            © {CURRENT_YEAR} Nexora · Customer Intelligence
          </p>
        </div>
      </main>
    </div>
  );
}
