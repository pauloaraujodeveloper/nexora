import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { createInitialState } from "./seed";
import { computeHealth } from "./health";
import { bandOf, uid } from "./format";
import { isAdminEmail } from "./admin";
import { userFromSession } from "./session";
import type {
  AppState,
  AuditEntry,
  Contact,
  Customer,
  HealthScore,
  Interaction,
  McpToken,
  OnboardingStep,
  Opportunity,
  OrgSettings,
  Session,
  Subtask,
  Task,
} from "./types";

const STORAGE_KEY = "nexora:state:v1";

type Action =
  | { type: "login"; session: Session }
  | { type: "logout" }
  | { type: "switchOrg"; orgId: string; userId: string }
  | { type: "addCustomer"; customer: Customer }
  | { type: "updateCustomer"; id: string; patch: Partial<Customer> }
  | { type: "addContact"; contact: Contact }
  | { type: "addInteraction"; interaction: Interaction }
  | { type: "updateStep"; id: string; patch: Partial<OnboardingStep> }
  | { type: "addOpportunity"; opportunity: Opportunity }
  | { type: "updateOpportunity"; id: string; patch: Partial<Opportunity> }
  | { type: "addTask"; task: Task }
  | { type: "updateTask"; id: string; patch: Partial<Task> }
  | { type: "reorderTasks"; items: { id: string; position: number }[] }
  | { type: "addSubtask"; taskId: string; subtask: Subtask }
  | { type: "toggleSubtask"; taskId: string; subtaskId: string }
  | { type: "removeSubtask"; taskId: string; subtaskId: string }
  | { type: "addToken"; token: McpToken }
  | { type: "revokeToken"; id: string }
  | { type: "updateSettings"; orgId: string; patch: Partial<OrgSettings> }
  | { type: "recalculate"; orgId: string }
  | { type: "audit"; entry: AuditEntry }
  | { type: "reset"; state: AppState };

function appendAudit(
  state: AppState,
  entry: Omit<AuditEntry, "id" | "orgId" | "at"> & { orgId?: string; at?: string },
): AuditEntry[] {
  const orgId = entry.orgId ?? state.session?.orgId ?? state.orgs[0].id;
  const audit: AuditEntry = {
    id: uid("aud"),
    orgId,
    at: entry.at ?? new Date().toISOString(),
    actorUserId: entry.actorUserId,
    actorKind: entry.actorKind,
    tokenId: entry.tokenId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    details: entry.details,
  };
  return [audit, ...state.audit];
}

function recalcCustomer(state: AppState, customer: Customer, now = new Date()): HealthScore[] {
  const settings = state.settings[customer.orgId];
  const interactions = state.interactions.filter((item) => item.customerId === customer.id);
  const steps = state.onboardingSteps.filter((item) => item.customerId === customer.id);
  const result = computeHealth(customer, interactions, steps, settings);
  const score: HealthScore = {
    id: uid("hsc"),
    orgId: customer.orgId,
    customerId: customer.id,
    calculatedAt: now.toISOString(),
    score: result.score,
    band: result.band,
    components: result.components,
    topFactors: result.topFactors,
  };
  const existing = state.scores.filter((item) => item.customerId === customer.id);
  const sameDay = existing.find(
    (item) => new Date(item.calculatedAt).toDateString() === now.toDateString(),
  );
  if (sameDay) {
    return [...state.scores.filter((item) => item.id !== sameDay.id), { ...score, id: sameDay.id }];
  }
  return [...state.scores, score];
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "login":
      return {
        ...state,
        session: action.session,
        audit: appendAudit(
          { ...state, session: action.session },
          {
            actorUserId: action.session.userId,
            actorKind: "user",
            action: "auth.login",
            entity: "session",
            details: { orgId: action.session.orgId, result: "success" },
          },
        ),
      };
    case "logout":
      return { ...state, session: null };
    case "switchOrg": {
      const target = state.users.find((user) => user.id === action.userId);
      const previous = state.session;
      const session: Session = {
        userId: action.userId,
        orgId: action.orgId,
        role: previous?.role ?? "member",
        email: target?.email ?? previous?.email ?? "",
        name: target?.name ?? previous?.name ?? "",
        picture: target?.id === previous?.userId ? previous?.picture : undefined,
        at: new Date().toISOString(),
      };
      return {
        ...state,
        session,
        audit: appendAudit(
          { ...state, session },
          {
            actorUserId: action.userId,
            actorKind: "user",
            action: "org.switched",
            entity: "organization",
            entityId: action.orgId,
            details: {},
          },
        ),
      };
    }
    case "addCustomer": {
      const next = { ...state, customers: [action.customer, ...state.customers] };
      return {
        ...next,
        scores: recalcCustomer(next, action.customer),
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "customer.created",
          entity: "customer",
          entityId: action.customer.id,
          details: { name: action.customer.tradeName },
        }),
      };
    }
    case "updateCustomer": {
      const customer = state.customers.find((item) => item.id === action.id);
      if (!customer) return state;
      const updated = { ...customer, ...action.patch, updatedAt: new Date().toISOString() };
      const next = {
        ...state,
        customers: state.customers.map((item) => (item.id === action.id ? updated : item)),
      };
      const scores =
        action.patch.status || action.patch.usageIndex != null || action.patch.lastContactAt
          ? recalcCustomer(next, updated)
          : next.scores;
      return {
        ...next,
        scores,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "customer.updated",
          entity: "customer",
          entityId: updated.id,
          details: { name: updated.tradeName, fields: Object.keys(action.patch) },
        }),
      };
    }
    case "addContact": {
      const next = { ...state, contacts: [action.contact, ...state.contacts] };
      return {
        ...next,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "contact.created",
          entity: "contact",
          entityId: action.contact.id,
          details: { customerId: action.contact.customerId, name: action.contact.name },
        }),
      };
    }
    case "addInteraction": {
      const customer = state.customers.find((item) => item.id === action.interaction.customerId);
      const next = {
        ...state,
        interactions: [action.interaction, ...state.interactions],
        customers: customer
          ? state.customers.map((item) =>
              item.id === customer.id
                ? { ...item, lastContactAt: action.interaction.occurredAt, updatedAt: new Date().toISOString() }
                : item,
            )
          : state.customers,
      };
      const updatedCustomer = next.customers.find((item) => item.id === action.interaction.customerId);
      return {
        ...next,
        scores: updatedCustomer ? recalcCustomer(next, updatedCustomer) : next.scores,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: action.interaction.source === "mcp" ? "mcp" : "user",
          action: "interaction.created",
          entity: "interaction",
          entityId: action.interaction.id,
          details: {
            customerId: action.interaction.customerId,
            type: action.interaction.type,
            subject: action.interaction.subject,
            source: action.interaction.source,
          },
        }),
      };
    }
    case "updateStep": {
      const step = state.onboardingSteps.find((item) => item.id === action.id);
      if (!step) return state;
      const updated = { ...step, ...action.patch };
      const next = {
        ...state,
        onboardingSteps: state.onboardingSteps.map((item) => (item.id === action.id ? updated : item)),
      };
      const customer = next.customers.find((item) => item.id === updated.customerId);
      return {
        ...next,
        scores: customer ? recalcCustomer(next, customer) : next.scores,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "onboarding.updated",
          entity: "onboarding_step",
          entityId: updated.id,
          details: { step: updated.name, status: updated.status },
        }),
      };
    }
    case "addOpportunity": {
      const next = { ...state, opportunities: [action.opportunity, ...state.opportunities] };
      return {
        ...next,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "opportunity.created",
          entity: "opportunity",
          entityId: action.opportunity.id,
          details: { title: action.opportunity.title, value: action.opportunity.value },
        }),
      };
    }
    case "updateOpportunity": {
      const opportunity = state.opportunities.find((item) => item.id === action.id);
      if (!opportunity) return state;
      const next = {
        ...state,
        opportunities: state.opportunities.map((item) =>
          item.id === action.id ? { ...item, ...action.patch } : item,
        ),
      };
      return {
        ...next,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "opportunity.updated",
          entity: "opportunity",
          entityId: action.id,
          details: { title: opportunity.title, stage: action.patch.stage ?? opportunity.stage },
        }),
      };
    }
    case "addTask": {
      const next = { ...state, tasks: [action.task, ...state.tasks] };
      return {
        ...next,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: action.task.source === "mcp" ? "mcp" : "user",
          action: "task.created",
          entity: "task",
          entityId: action.task.id,
          details: { title: action.task.title, customerId: action.task.customerId },
        }),
      };
    }
    case "updateTask": {
      const task = state.tasks.find((item) => item.id === action.id);
      if (!task) return state;
      const next = {
        ...state,
        tasks: state.tasks.map((item) => (item.id === action.id ? { ...item, ...action.patch } : item)),
      };
      return {
        ...next,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "task.updated",
          entity: "task",
          entityId: action.id,
          details: { title: task.title, status: action.patch.status ?? task.status },
        }),
      };
    }
    case "reorderTasks": {
      const order = new Map(action.items.map((item) => [item.id, item.position]));
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          order.has(task.id) ? { ...task, position: order.get(task.id) } : task,
        ),
      };
    }
    case "addSubtask": {
      const task = state.tasks.find((item) => item.id === action.taskId);
      if (!task) return state;
      const next = {
        ...state,
        tasks: state.tasks.map((item) =>
          item.id === action.taskId
            ? { ...item, subtasks: [...(item.subtasks ?? []), action.subtask] }
            : item,
        ),
      };
      return {
        ...next,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "task.subtask_added",
          entity: "task",
          entityId: task.id,
          details: { title: task.title, subtask: action.subtask.title },
        }),
      };
    }
    case "toggleSubtask": {
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.taskId
            ? {
                ...task,
                subtasks: (task.subtasks ?? []).map((sub) =>
                  sub.id === action.subtaskId ? { ...sub, done: !sub.done } : sub,
                ),
              }
            : task,
        ),
      };
    }
    case "removeSubtask": {
      const task = state.tasks.find((item) => item.id === action.taskId);
      if (!task) return state;
      const subtask = (task.subtasks ?? []).find((sub) => sub.id === action.subtaskId);
      const next = {
        ...state,
        tasks: state.tasks.map((item) =>
          item.id === action.taskId
            ? { ...item, subtasks: (item.subtasks ?? []).filter((sub) => sub.id !== action.subtaskId) }
            : item,
        ),
      };
      return {
        ...next,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "task.subtask_removed",
          entity: "task",
          entityId: task.id,
          details: { title: task.title, subtask: subtask?.title ?? "" },
        }),
      };
    }
    case "addToken": {
      const next = { ...state, tokens: [action.token, ...state.tokens] };
      return {
        ...next,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "token.created",
          entity: "mcp_token",
          entityId: action.token.id,
          details: { label: action.token.label, scopes: action.token.scopes },
        }),
      };
    }
    case "revokeToken": {
      const token = state.tokens.find((item) => item.id === action.id);
      if (!token) return state;
      const next = {
        ...state,
        tokens: state.tokens.map((item) =>
          item.id === action.id ? { ...item, revokedAt: new Date().toISOString() } : item,
        ),
      };
      return {
        ...next,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "token.revoked",
          entity: "mcp_token",
          entityId: action.id,
          details: { label: token.label },
        }),
      };
    }
    case "updateSettings": {
      const next = {
        ...state,
        settings: {
          ...state.settings,
          [action.orgId]: { ...state.settings[action.orgId], ...action.patch },
        },
      };
      return {
        ...next,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "user",
          action: "settings.updated",
          entity: "organization_settings",
          entityId: action.orgId,
          details: { fields: Object.keys(action.patch) },
        }),
      };
    }
    case "recalculate": {
      const customers = state.customers.filter((item) => item.orgId === action.orgId);
      let scores = state.scores;
      for (const customer of customers) {
        const settings = state.settings[customer.orgId];
        const interactions = state.interactions.filter((item) => item.customerId === customer.id);
        const steps = state.onboardingSteps.filter((item) => item.customerId === customer.id);
        const result = computeHealth(customer, interactions, steps, settings);
        scores = [
          ...scores,
          {
            id: uid("hsc"),
            orgId: customer.orgId,
            customerId: customer.id,
            calculatedAt: new Date().toISOString(),
            score: result.score,
            band: bandOf(result.score, settings.healthyThreshold, settings.attentionThreshold),
            components: result.components,
            topFactors: result.topFactors,
          },
        ];
      }
      const next = { ...state, scores };
      return {
        ...next,
        audit: appendAudit(next, {
          actorUserId: state.session?.userId,
          actorKind: "system",
          action: "score.recalculated",
          entity: "health_score",
          details: { customers: customers.length },
        }),
      };
    }
    case "audit": {
      return { ...state, audit: [action.entry, ...state.audit] };
    }
    case "reset":
      return action.state;
    default:
      return state;
  }
}

function normalizeSession(state: AppState): AppState {
  const session = state.session;
  if (!session) return state;

  const user = state.users.find((item) => item.id === session.userId);
  const email = session.email ?? user?.email ?? "";
  const name = session.name ?? user?.name ?? "";

  if (!user && (!email || !name)) {
    return { ...state, session: null };
  }

  return {
    ...state,
    session: {
      ...session,
      role: session.role ?? (isAdminEmail(email) ? "admin" : "member"),
      email,
      name: name || email,
    },
  };
}

function loadState(): AppState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.version || !parsed.customers?.length) return createInitialState();
    return normalizeSession(parsed);
  } catch {
    return createInitialState();
  }
}

type AppContextValue = {
  state: AppState;
  dispatch: Dispatch<Action>;
  session: Session | null;
  currentUser: AppState["users"][number] | null;
  currentOrg: AppState["orgs"][number] | null;
  settings: OrgSettings | null;
  resetDemo: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be blocked; the demo still works in memory.
    }
  }, [state]);

  useEffect(() => {
    const reduce = state.settings[state.session?.orgId ?? "org_orbita"]?.reduceMotion;
    document.documentElement.dataset.reducedMotion = reduce ? "true" : "false";
  }, [state.settings, state.session?.orgId]);

  const value = useMemo<AppContextValue>(() => {
    const session = state.session;
    const currentUser = session
      ? state.users.find((user) => user.id === session.userId) ?? userFromSession(session)
      : null;
    const currentOrg = session ? state.orgs.find((org) => org.id === session.orgId) ?? null : null;
    const settings = session ? state.settings[session.orgId] ?? null : null;
    return {
      state,
      dispatch,
      session,
      currentUser,
      currentOrg,
      settings,
      resetDemo: () => {
        const fresh = createInitialState();
        const keepSession = state.session;
        dispatch({ type: "reset", state: { ...fresh, session: keepSession } });
      },
    };
  }, [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}

export function useOrgData() {
  const { state, session } = useApp();
  const orgId = session?.orgId ?? state.orgs[0].id;
  return useMemo(() => {
    const customers = state.customers.filter((item) => item.orgId === orgId);
    const customerIds = new Set(customers.map((item) => item.id));
    return {
      orgId,
      customers,
      contacts: state.contacts.filter((item) => item.orgId === orgId),
      interactions: state.interactions.filter((item) => customerIds.has(item.customerId)),
      onboardingSteps: state.onboardingSteps.filter((item) => customerIds.has(item.customerId)),
      scores: state.scores.filter((item) => item.orgId === orgId),
      opportunities: state.opportunities.filter((item) => item.orgId === orgId),
      risks: state.risks.filter((item) => item.orgId === orgId),
      tasks: state.tasks.filter((item) => item.orgId === orgId),
      tokens: state.tokens.filter((item) => item.orgId === orgId),
      audit: state.audit.filter((item) => item.orgId === orgId),
      users: state.users.filter((item) => item.orgId === orgId),
      settings: state.settings[orgId],
    };
  }, [state, orgId]);
}
