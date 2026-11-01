export type Role = "super_admin" | "admin" | "gestor" | "csm" | "comercial" | "leitura";

export type CustomerStatus = "onboarding" | "ativo" | "em_risco" | "cancelado";
export type HealthBand = "saudavel" | "atencao" | "risco";
export type Sentiment = "positivo" | "neutro" | "negativo";
export type InteractionType = "ligacao" | "email" | "reuniao" | "mensagem" | "visita" | "nota";
export type OnboardingStatus = "pendente" | "em_andamento" | "concluida" | "bloqueada";
export type OpportunityType = "upsell" | "cross_sell" | "renovacao" | "indicacao";
export type OpportunityStage = "identificada" | "em_conversa" | "proposta" | "ganha" | "perdida";
export type TaskPriority = "baixa" | "media" | "alta";
export type TaskStatus = "aberta" | "em_andamento" | "concluida";
export type RiskSeverity = "baixa" | "media" | "alta" | "critica";
export type PaymentStatus = "em_dia" | "atraso_curto" | "atraso_longo";
export type CancelReason = "preco" | "concorrente" | "falta_de_uso" | "falha_de_suporte" | "fim_de_projeto" | "outro";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: "ativa" | "suspensa";
  createdAt: string;
};

export type User = {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  color: string;
  title: string;
};

export type Customer = {
  id: string;
  orgId: string;
  legalName: string;
  tradeName: string;
  document: string;
  segment: string;
  size: "micro" | "pequena" | "media" | "grande";
  city: string;
  state: string;
  website: string;
  plan: string;
  mrr: number;
  status: CustomerStatus;
  ownerId: string;
  contractStart: string;
  renewalDate: string;
  canceledAt?: string;
  cancelReason?: CancelReason;
  tags: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  usageIndex: number;
  openTickets: number;
  criticalTickets: number;
  paymentStatus: PaymentStatus;
  nps: number | null;
  lastContactAt: string | null;
  logoColor: string;
};

export type Contact = {
  id: string;
  orgId: string;
  customerId: string;
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  isDecisionMaker: boolean;
};

export type Interaction = {
  id: string;
  orgId: string;
  customerId: string;
  type: InteractionType;
  occurredAt: string;
  subject: string;
  summary: string;
  sentiment: Sentiment;
  nextSteps: string;
  participants: string[];
  createdBy: string;
  source: "ui" | "mcp" | "import";
};

export type OnboardingStep = {
  id: string;
  orgId: string;
  customerId: string;
  position: number;
  name: string;
  ownerId: string;
  dueDate: string;
  completedAt?: string;
  status: OnboardingStatus;
  blockedReason?: string;
  notes?: string;
};

export type ScoreComponent = {
  key: string;
  label: string;
  value: number;
  weight: number;
  points: number;
  detail: string;
};

export type HealthScore = {
  id: string;
  orgId: string;
  customerId: string;
  calculatedAt: string;
  score: number;
  band: HealthBand;
  components: ScoreComponent[];
  topFactors: string[];
};

export type Opportunity = {
  id: string;
  orgId: string;
  customerId: string;
  type: OpportunityType;
  title: string;
  value: number;
  probability: number;
  stage: OpportunityStage;
  expectedClose: string;
  ownerId: string;
  createdAt: string;
};

export type Risk = {
  id: string;
  orgId: string;
  customerId: string;
  category: string;
  severity: RiskSeverity;
  description: string;
  actionPlan: string;
  status: "aberto" | "mitigando" | "resolvido";
  createdAt: string;
};

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
};

export type Task = {
  id: string;
  orgId: string;
  customerId?: string;
  interactionId?: string;
  title: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: string;
  createdAt: string;
  source: "ui" | "mcp" | "playbook";
  /** Order inside the status column. Missing means "after positioned tasks". */
  position?: number;
  subtasks?: Subtask[];
};

export type McpToken = {
  id: string;
  orgId: string;
  userId: string;
  label: string;
  tokenPreview: string;
  scopes: string[];
  expiresAt: string;
  revokedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  orgId: string;
  at: string;
  actorUserId?: string;
  actorKind: "user" | "mcp" | "system";
  tokenId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details: Record<string, unknown>;
};

export type ScoreWeights = {
  contact: number;
  onboarding: number;
  usage: number;
  support: number;
  finance: number;
  sentiment: number;
};

export type OnboardingTemplateStep = {
  name: string;
  ownerRole: Role;
  days: number;
};

export type OrgSettings = {
  scoreWeights: ScoreWeights;
  healthyThreshold: number;
  attentionThreshold: number;
  contactLimitDays: number;
  alerts: {
    noContact: boolean;
    onboardingLate: boolean;
    scoreDrop: boolean;
    renewal: boolean;
    criticalRisk: boolean;
  };
  onboardingTemplate: OnboardingTemplateStep[];
  reduceMotion: boolean;
  autoRefresh: boolean;
};

export type SessionRole = "admin" | "member";

export type Session = {
  userId: string;
  orgId: string;
  role: SessionRole;
  email: string;
  name: string;
  picture?: string;
  at: string;
};

export type AppState = {
  version: number;
  orgs: Organization[];
  users: User[];
  customers: Customer[];
  contacts: Contact[];
  interactions: Interaction[];
  onboardingSteps: OnboardingStep[];
  scores: HealthScore[];
  opportunities: Opportunity[];
  risks: Risk[];
  tasks: Task[];
  tokens: McpToken[];
  audit: AuditEntry[];
  settings: Record<string, OrgSettings>;
  session: Session | null;
};

export type CustomerFilters = {
  q: string;
  status: CustomerStatus | "todos";
  band: HealthBand | "todas";
  segment: string;
  owner: string;
  state: string;
  tag: string;
  lastContact: "todos" | "30" | "60" | "90";
};

export type DashboardPeriod = 30 | 90 | 180 | 365;

export type DashboardFilters = {
  period: DashboardPeriod;
  owner: string;
  segment: string;
  plan: string;
};
