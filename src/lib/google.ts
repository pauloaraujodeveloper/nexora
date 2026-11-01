const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export type GoogleProfile = {
  email: string;
  name: string;
  picture?: string;
};

export type GoogleCredentialResponse = {
  credential: string;
};

export type GooglePromptNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
  getDismissedReason: () => string;
};

type GoogleInitializeConfig = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  use_fedcm_for_prompt?: boolean;
  locale?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleInitializeConfig) => void;
          prompt: (listener?: (notification: GooglePromptNotification) => void) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

let loader: Promise<void> | null = null;

/** Injects the official Google Identity Services script once, on demand. */
export function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`,
    );
    const fail = () => {
      loader = null;
      reject(new Error("google-script"));
    };

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", fail, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = fail;
    document.head.appendChild(script);
  });

  return loader;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Reads the JWT payload only. The credential is not verified here because the
 * app has no backend; production must validate the token server-side.
 */
export function decodeGoogleCredential(credential: string): GoogleProfile {
  const payload = credential.split(".")[1];
  if (!payload) throw new Error("invalid-credential");

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  const decoded: unknown = JSON.parse(new TextDecoder().decode(bytes));

  if (!isRecord(decoded)) throw new Error("invalid-credential");

  const email = typeof decoded.email === "string" ? decoded.email : "";
  const name = typeof decoded.name === "string" ? decoded.name : "";
  const picture = typeof decoded.picture === "string" ? decoded.picture : undefined;

  if (!email) throw new Error("invalid-credential");
  return { email, name, picture };
}

export function promptMessage(notification: GooglePromptNotification): string | null {
  if (notification.isNotDisplayed()) {
    const reason = notification.getNotDisplayedReason();
    if (reason === "opt_out_or_no_session") {
      return "Nenhuma conta Google conectada neste navegador. Entre com e-mail e senha ou faça login no Google.";
    }
    if (reason === "unregistered_origin") {
      return "Esta origem não está autorizada no Google Cloud Console.";
    }
    if (reason === "invalid_client") {
      return "O Client ID do Google está inválido. Confira a variável VITE_GOOGLE_CLIENT_ID.";
    }
    return "Não foi possível abrir a janela do Google. Verifique se pop-ups e cookies de terceiros estão liberados.";
  }

  if (notification.isSkippedMoment()) {
    return "O login com Google foi cancelado.";
  }

  if (notification.isDismissedMoment()) {
    return "Login com Google cancelado. Tente novamente.";
  }

  return null;
}
