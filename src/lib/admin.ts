/**
 * UI-only admin check. Without a backend this list is not real security;
 * production must validate admin access on the server.
 */
export function isAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const configured = import.meta.env.VITE_ADMIN_EMAILS;
  if (typeof configured !== "string") return false;

  return configured
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}
