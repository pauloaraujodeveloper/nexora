import { useEffect, useRef, useState } from "react";
import { SocialButton } from "@/components/base/social-button/social-button";
import { Spinner } from "@/components/base/spinner/spinner";
import {
  decodeGoogleCredential,
  loadGoogleIdentityServices,
  promptMessage,
  type GoogleProfile,
} from "@/lib/google";

type GoogleButtonProps = {
  onProfile: (profile: GoogleProfile) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
};

export function GoogleButton({ onProfile, onError, disabled = false }: GoogleButtonProps) {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(Boolean(clientId));
  const [busy, setBusy] = useState(false);
  const onProfileRef = useRef(onProfile);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onProfileRef.current = onProfile;
    onErrorRef.current = onError;
  }, [onProfile, onError]);

  useEffect(() => {
    if (!clientId) return;
    let active = true;

    loadGoogleIdentityServices()
      .then(() => {
        if (!active) return;
        const google = window.google?.accounts.id;
        if (!google) throw new Error("google-unavailable");

        google.initialize({
          client_id: clientId,
          callback: (response) => {
            try {
              onProfileRef.current(decodeGoogleCredential(response.credential));
            } catch {
              onErrorRef.current(
                "Não foi possível ler os dados da sua conta Google. Tente novamente.",
              );
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
          locale: "pt-BR",
        });
        setReady(true);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        onErrorRef.current(
          "Não foi possível carregar o Google. Verifique sua conexão e tente novamente.",
        );
      });

    return () => {
      active = false;
    };
  }, [clientId]);

  function handleClick() {
    onErrorRef.current(null);

    if (!clientId) {
      onErrorRef.current("O login com Google ainda não está configurado neste ambiente.");
      return;
    }
    if (loading) {
      onErrorRef.current("O Google ainda está carregando. Tente novamente em instantes.");
      return;
    }

    const google = window.google?.accounts.id;
    if (!ready || !google) {
      onErrorRef.current(
        "Não foi possível carregar o Google. Verifique sua conexão e tente novamente.",
      );
      return;
    }

    setBusy(true);
    google.prompt((notification) => {
      setBusy(false);
      const message = promptMessage(notification);
      if (message) onErrorRef.current(message);
    });
  }

  return (
    <SocialButton
      brand="google"
      appearance="colorful"
      size="medium"
      fullWidth
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={handleClick}
    >
      {busy ? (
        <span className="inline-flex items-center gap-1.5">
          <Spinner size="sm" aria-hidden className="text-white" />
          Conectando…
        </span>
      ) : (
        "Continuar com Google"
      )}
    </SocialButton>
  );
}
