import type { Organization, Session, SessionRole, User } from "./types";

export function findUserByEmail(users: User[], email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find((user) => user.email.toLowerCase() === normalized);
}

export function buildSession({
  users,
  orgs,
  email,
  role,
  name,
  picture,
}: {
  users: User[];
  orgs: Organization[];
  email: string;
  role: SessionRole;
  name?: string;
  picture?: string;
}): Session | null {
  const normalized = email.trim().toLowerCase();
  const user = findUserByEmail(users, normalized);
  const orgId = user?.orgId ?? orgs[0]?.id;
  if (!orgId) return null;

  return {
    userId: user?.id ?? `google:${normalized}`,
    orgId,
    role,
    email: normalized,
    name: name?.trim() || user?.name || normalized.split("@")[0] || "Visitante",
    picture,
    at: new Date().toISOString(),
  };
}

export function userFromSession(session: Session): User {
  return {
    id: session.userId,
    orgId: session.orgId,
    name: session.name || session.email || "Visitante",
    email: session.email,
    role: session.role === "admin" ? "admin" : "leitura",
    active: true,
    color: "#7c8cff",
    title: session.role === "admin" ? "Administrador" : "Membro",
  };
}
