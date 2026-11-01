import { bandOf, isoDaysAgo, isoDaysFromNow, isoMonthsAgo, slugify } from "./format";
import { computeHealth } from "./health";
import type {
  AppState,
  AuditEntry,
  Contact,
  Customer,
  CustomerStatus,
  HealthScore,
  Interaction,
  InteractionType,
  McpToken,
  OnboardingStep,
  Opportunity,
  OrgSettings,
  Organization,
  Risk,
  Sentiment,
  Task,
  User,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Deterministic helpers                                                      */
/* -------------------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261029);
const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)];
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const COLORS = ["#22d3ee", "#7c8cff", "#e040fb", "#34d399", "#fbbf24", "#60a5fa", "#a78bfa", "#fb7185", "#2dd4bf"];

const FIRST_NAMES = [
  "Marina", "Rafael", "Camila", "Diego", "Lucas", "Beatriz", "Helena", "Bruno", "Clara", "André",
  "Patrícia", "Thiago", "Juliana", "Felipe", "Renata", "Gustavo", "Aline", "Rodrigo", "Sofia", "Marcelo",
  "Isabela", "Henrique", "Larissa", "Vitor", "Natália", "Eduardo", "Carolina", "Leonardo", "Fernanda", "Caio",
];

const LAST_NAMES = [
  "Alves", "Nogueira", "Torres", "Martins", "Prado", "Lima", "Costa", "Sá", "Reis", "Moura",
  "Barros", "Rocha", "Mendes", "Cavalcanti", "Freitas", "Azevedo", "Pinto", "Cardoso", "Teixeira", "Moreira",
];

const JOB_TITLES = [
  "Diretora de Operações", "Head de Tecnologia", "Gerente de Projetos", "CFO", "COO", "Head de Customer Success",
  "Coordenadora de TI", "Gerente de Compras", "VP de Operações", "Especialista em Integrações",
  "Gerente de Marketing", "Diretor Comercial", "Analista de Sistemas", "Head de Produto", "Controller",
];

const SEGMENTS = [
  "Logística", "Saúde", "Varejo", "Educação", "Alimentos", "Financeiro", "Turismo", "Construção",
  "Beleza", "Energia", "Seguros", "Agronegócio", "Imobiliário", "Tecnologia", "Moda", "Consultoria",
  "Marketing", "Jurídico", "Mineração", "Serviços",
];

const PLANS = ["Starter", "Growth", "Enterprise"];

const INTERACTION_SUBJECTS: Record<InteractionType, string[]> = {
  reuniao: [
    "Reunião de acompanhamento mensal",
    "Revisão trimestral de resultados",
    "Alinhamento de roadmap",
    "QBR — Business Review",
    "Reunião de renovação",
    "Workshop de melhores práticas",
  ],
  email: [
    "Follow-up de action items",
    "Envio de relatório de uso",
    "Alinhamento de cronograma",
    "Resposta sobre integração",
    "Compartilhamento de proposta",
  ],
  ligacao: [
    "Check-in rápido de relacionamento",
    "Ligação sobre tickets abertos",
    "Alinhamento de patrocinador",
    "Retorno sobre onboarding",
  ],
  mensagem: [
    "Mensagem de acompanhamento",
    "Confirmação de reunião",
    "Atualização rápida de status",
  ],
  visita: [
    "Visita presencial ao cliente",
    "Workshop presencial de implantação",
    "Reunião com stakeholders na sede",
  ],
  nota: [
    "Nota interna de contexto",
    "Registro de bastidores",
    "Hipótese de risco",
  ],
};

const SUMMARIES = {
  positivo: [
    "Cliente destacou ganhos de produtividade e reforçou intenção de ampliar o uso.",
    "Patrocinador elogiou o atendimento e confirmou renovação antecipada.",
    "Time engajado, com novos casos de uso mapeados para o próximo trimestre.",
    "Implantação avançou sem bloqueios e o time já vê valor no dia a dia.",
  ],
  neutro: [
    "Conversa de rotina: revisamos pendências e combinamos próximos passos.",
    "Alinhamento de cronograma sem mudanças relevantes de escopo.",
    "Cliente pediu mais tempo para avaliar a proposta de expansão.",
    "Revisamos indicadores e mantivemos o plano de ação atual.",
  ],
  negativo: [
    "Cliente relatou lentidão em integrações e cobrou prazo para correção.",
    "Patrocinador ausente nas últimas reuniões e engajamento em queda.",
    "Insatisfação com volume de tickets abertos e tempo de resposta.",
    "Uso caiu no último mês e o time não vê prioridade no projeto.",
  ],
};

const NEXT_STEPS = [
  "Enviar plano de ação até sexta-feira.",
  "Agendar workshop com o time de dados.",
  "Escalar ticket crítico para o time de engenharia.",
  "Preparar proposta de expansão para o próximo trimestre.",
  "Confirmar patrocinador executivo na próxima reunião.",
  "Revisar cronograma de implantação com o cliente.",
];

/* -------------------------------------------------------------------------- */
/* Organizations and users                                                    */
/* -------------------------------------------------------------------------- */

const orgOrbita: Organization = {
  id: "org_orbita",
  name: "Órbita Software",
  slug: "orbita-software",
  plan: "Business",
  status: "ativa",
  createdAt: isoDaysAgo(720),
};

const orgMare: Organization = {
  id: "org_mare",
  name: "Maré Consultoria",
  slug: "mare-consultoria",
  plan: "Growth",
  status: "ativa",
  createdAt: isoDaysAgo(410),
};

const users: User[] = [
  { id: "usr_rafael", orgId: "org_orbita", name: "Rafael Nogueira", email: "rafael@orbita.com.br", role: "gestor", active: true, color: "#7c8cff", title: "Head de Customer Success" },
  { id: "usr_marina", orgId: "org_orbita", name: "Marina Alves", email: "marina@orbita.com.br", role: "csm", active: true, color: "#22d3ee", title: "Customer Success Manager" },
  { id: "usr_lucas", orgId: "org_orbita", name: "Lucas Prado", email: "lucas@orbita.com.br", role: "csm", active: true, color: "#34d399", title: "Customer Success Manager" },
  { id: "usr_beatriz", orgId: "org_orbita", name: "Beatriz Lima", email: "beatriz@orbita.com.br", role: "csm", active: true, color: "#e040fb", title: "Customer Success Manager" },
  { id: "usr_camila", orgId: "org_orbita", name: "Camila Torres", email: "camila@orbita.com.br", role: "comercial", active: true, color: "#fbbf24", title: "Executiva Comercial" },
  { id: "usr_diego", orgId: "org_orbita", name: "Diego Martins", email: "diego@orbita.com.br", role: "admin", active: true, color: "#fb7185", title: "Administrador de Operações" },
  { id: "usr_helena", orgId: "org_mare", name: "Helena Costa", email: "helena@mare.com.br", role: "gestor", active: true, color: "#22d3ee", title: "Head de Customer Success" },
  { id: "usr_bruno", orgId: "org_mare", name: "Bruno Sá", email: "bruno@mare.com.br", role: "csm", active: true, color: "#7c8cff", title: "Customer Success Manager" },
  { id: "usr_clara", orgId: "org_mare", name: "Clara Reis", email: "clara@mare.com.br", role: "csm", active: true, color: "#e040fb", title: "Customer Success Manager" },
];

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

const defaultSettings = (): OrgSettings => ({
  scoreWeights: { contact: 25, onboarding: 20, usage: 20, support: 15, finance: 10, sentiment: 10 },
  healthyThreshold: 80,
  attentionThreshold: 50,
  contactLimitDays: 30,
  alerts: { noContact: true, onboardingLate: true, scoreDrop: true, renewal: true, criticalRisk: true },
  onboardingTemplate: [
    { name: "Kickoff", ownerRole: "csm", days: 0 },
    { name: "Coleta de requisitos", ownerRole: "csm", days: 7 },
    { name: "Configuração", ownerRole: "csm", days: 14 },
    { name: "Integração de dados", ownerRole: "csm", days: 21 },
    { name: "Treinamento", ownerRole: "csm", days: 28 },
    { name: "Go-live", ownerRole: "csm", days: 35 },
    { name: "Acompanhamento 30 dias", ownerRole: "gestor", days: 65 },
  ],
  reduceMotion: false,
  autoRefresh: true,
});

/* -------------------------------------------------------------------------- */
/* Customer seeds                                                             */
/* -------------------------------------------------------------------------- */

type SeedCustomer = {
  name: string;
  segment: string;
  size: Customer["size"];
  city: string;
  state: string;
  plan: string;
  mrr: number;
  status: CustomerStatus;
  owner: string;
  renewalIn: number;
  lastContact: number;
  usage: number;
  tickets: number;
  critical: number;
  payment: Customer["paymentStatus"];
  nps: number | null;
  tags: string[];
  canceledAgo?: number;
  reason?: Customer["cancelReason"];
  contractMonths?: number;
};

const orbitaSeeds: SeedCustomer[] = [
  { name: "Alfa Logística", segment: "Logística", size: "grande", city: "São Paulo", state: "SP", plan: "Enterprise", mrr: 18900, status: "em_risco", owner: "usr_marina", renewalIn: 45, lastContact: 47, usage: 34, tickets: 4, critical: 1, payment: "atraso_curto", nps: 4, tags: ["Estratégico", "Renovação 90d"], contractMonths: 26 },
  { name: "Beta Saúde", segment: "Saúde", size: "media", city: "Fortaleza", state: "CE", plan: "Growth", mrr: 12400, status: "onboarding", owner: "usr_lucas", renewalIn: 300, lastContact: 3, usage: 45, tickets: 2, critical: 0, payment: "em_dia", nps: null, tags: ["Implantação", "Integração crítica"], contractMonths: 2 },
  { name: "Coração Varejo", segment: "Varejo", size: "media", city: "Recife", state: "PE", plan: "Growth", mrr: 9800, status: "ativo", owner: "usr_marina", renewalIn: 120, lastContact: 3, usage: 88, tickets: 0, critical: 0, payment: "em_dia", nps: 9, tags: ["Expansão", "Advocate"], contractMonths: 14 },
  { name: "Delta Educação", segment: "Educação", size: "grande", city: "Salvador", state: "BA", plan: "Enterprise", mrr: 7600, status: "cancelado", owner: "usr_beatriz", renewalIn: -20, lastContact: 34, usage: 12, tickets: 3, critical: 1, payment: "atraso_longo", nps: 3, tags: ["Churn", "Falta de uso"], canceledAgo: 20, reason: "falta_de_uso", contractMonths: 18 },
  { name: "Órbita Foods", segment: "Alimentos", size: "media", city: "Curitiba", state: "PR", plan: "Growth", mrr: 8700, status: "ativo", owner: "usr_lucas", renewalIn: 160, lastContact: 9, usage: 74, tickets: 1, critical: 0, payment: "em_dia", nps: 8, tags: ["Estratégico"], contractMonths: 11 },
  { name: "Aurora Financeira", segment: "Financeiro", size: "grande", city: "São Paulo", state: "SP", plan: "Enterprise", mrr: 24500, status: "ativo", owner: "usr_marina", renewalIn: 210, lastContact: 5, usage: 92, tickets: 0, critical: 0, payment: "em_dia", nps: 9, tags: ["Estratégico", "Expansão"], contractMonths: 32 },
  { name: "Bússola Turismo", segment: "Turismo", size: "pequena", city: "Natal", state: "RN", plan: "Starter", mrr: 3200, status: "ativo", owner: "usr_beatriz", renewalIn: 75, lastContact: 12, usage: 68, tickets: 1, critical: 0, payment: "em_dia", nps: 7, tags: ["Renovação 90d"], contractMonths: 9 },
  { name: "Cais Engenharia", segment: "Construção", size: "grande", city: "Fortaleza", state: "CE", plan: "Enterprise", mrr: 21000, status: "ativo", owner: "usr_lucas", renewalIn: 88, lastContact: 14, usage: 81, tickets: 1, critical: 0, payment: "em_dia", nps: 8, tags: ["Estratégico", "Renovação 90d"], contractMonths: 22 },
  { name: "Duna Cosméticos", segment: "Beleza", size: "media", city: "Recife", state: "PE", plan: "Growth", mrr: 6900, status: "em_risco", owner: "usr_marina", renewalIn: 28, lastContact: 21, usage: 42, tickets: 3, critical: 0, payment: "atraso_curto", nps: 5, tags: ["Renovação 90d", "Financeiro"], contractMonths: 15 },
  { name: "Eco Energia", segment: "Energia", size: "grande", city: "Brasília", state: "DF", plan: "Enterprise", mrr: 17800, status: "ativo", owner: "usr_lucas", renewalIn: 190, lastContact: 8, usage: 79, tickets: 0, critical: 0, payment: "em_dia", nps: 8, tags: ["Estratégico"], contractMonths: 28 },
  { name: "Fênix Seguros", segment: "Seguros", size: "grande", city: "São Paulo", state: "SP", plan: "Enterprise", mrr: 19600, status: "em_risco", owner: "usr_beatriz", renewalIn: 52, lastContact: 16, usage: 51, tickets: 5, critical: 2, payment: "em_dia", nps: 4, tags: ["Estratégico", "Suporte crítico"], contractMonths: 19 },
  { name: "Girassol Agro", segment: "Agronegócio", size: "media", city: "Ribeirão Preto", state: "SP", plan: "Growth", mrr: 7400, status: "ativo", owner: "usr_marina", renewalIn: 145, lastContact: 6, usage: 72, tickets: 1, critical: 0, payment: "em_dia", nps: 8, tags: ["Sazonal"], contractMonths: 13 },
  { name: "Horizonte Imóveis", segment: "Imobiliário", size: "media", city: "João Pessoa", state: "PB", plan: "Growth", mrr: 5600, status: "ativo", owner: "usr_lucas", renewalIn: 110, lastContact: 11, usage: 66, tickets: 0, critical: 0, payment: "em_dia", nps: 7, tags: ["Indicação"], contractMonths: 8 },
  { name: "Íris Tecnologia", segment: "Tecnologia", size: "media", city: "Florianópolis", state: "SC", plan: "Growth", mrr: 9200, status: "ativo", owner: "usr_beatriz", renewalIn: 70, lastContact: 4, usage: 85, tickets: 0, critical: 0, payment: "em_dia", nps: 9, tags: ["Expansão", "Renovação 90d"], contractMonths: 17 },
  { name: "Jasmim Moda", segment: "Moda", size: "pequena", city: "Fortaleza", state: "CE", plan: "Starter", mrr: 2800, status: "em_risco", owner: "usr_marina", renewalIn: 36, lastContact: 25, usage: 38, tickets: 2, critical: 0, payment: "em_dia", nps: 5, tags: ["Baixo uso"], contractMonths: 10 },
  { name: "Kairós Consultoria", segment: "Consultoria", size: "media", city: "São Paulo", state: "SP", plan: "Growth", mrr: 6100, status: "ativo", owner: "usr_lucas", renewalIn: 170, lastContact: 7, usage: 71, tickets: 1, critical: 0, payment: "em_dia", nps: 8, tags: [], contractMonths: 12 },
  { name: "Lótus Farmácia", segment: "Saúde", size: "pequena", city: "Mossoró", state: "RN", plan: "Starter", mrr: 2400, status: "ativo", owner: "usr_beatriz", renewalIn: 95, lastContact: 18, usage: 63, tickets: 1, critical: 0, payment: "em_dia", nps: 7, tags: ["Renovação 90d"], contractMonths: 7 },
  { name: "Maré Digital", segment: "Marketing", size: "media", city: "Recife", state: "PE", plan: "Growth", mrr: 4800, status: "onboarding", owner: "usr_marina", renewalIn: 320, lastContact: 2, usage: 39, tickets: 1, critical: 0, payment: "em_dia", nps: null, tags: ["Implantação"], contractMonths: 1 },
  { name: "Norte Solar", segment: "Energia", size: "media", city: "Belém", state: "PA", plan: "Growth", mrr: 7200, status: "ativo", owner: "usr_lucas", renewalIn: 205, lastContact: 41, usage: 69, tickets: 0, critical: 0, payment: "em_dia", nps: 7, tags: ["Sem contato"], contractMonths: 16 },
  { name: "Oceano Logística", segment: "Logística", size: "grande", city: "Santos", state: "SP", plan: "Enterprise", mrr: 15200, status: "em_risco", owner: "usr_beatriz", renewalIn: 39, lastContact: 38, usage: 44, tickets: 2, critical: 1, payment: "atraso_curto", nps: 4, tags: ["Estratégico", "Sem contato", "Renovação 90d"], contractMonths: 21 },
  { name: "Pilar Construções", segment: "Construção", size: "media", city: "Maceió", state: "AL", plan: "Growth", mrr: 5300, status: "ativo", owner: "usr_marina", renewalIn: 135, lastContact: 10, usage: 64, tickets: 0, critical: 0, payment: "em_dia", nps: 7, tags: [], contractMonths: 9 },
  { name: "Quinta Essência", segment: "Alimentos", size: "pequena", city: "Aracaju", state: "SE", plan: "Starter", mrr: 1900, status: "cancelado", owner: "usr_lucas", renewalIn: -65, lastContact: 78, usage: 8, tickets: 2, critical: 0, payment: "atraso_longo", nps: 2, tags: ["Churn", "Fim de projeto"], canceledAgo: 65, reason: "fim_de_projeto", contractMonths: 6 },
  { name: "Rota Certa", segment: "Logística", size: "media", city: "Goiânia", state: "GO", plan: "Growth", mrr: 4600, status: "ativo", owner: "usr_beatriz", renewalIn: 58, lastContact: 36, usage: 61, tickets: 1, critical: 0, payment: "em_dia", nps: 6, tags: ["Sem contato", "Renovação 90d"], contractMonths: 12 },
  { name: "Sol Nascente", segment: "Energia", size: "grande", city: "Teresina", state: "PI", plan: "Enterprise", mrr: 13400, status: "ativo", owner: "usr_marina", renewalIn: 230, lastContact: 2, usage: 90, tickets: 0, critical: 0, payment: "em_dia", nps: 9, tags: ["Estratégico", "Expansão"], contractMonths: 34 },
  { name: "Trigo Dourado", segment: "Alimentos", size: "pequena", city: "Campina Grande", state: "PB", plan: "Starter", mrr: 2200, status: "ativo", owner: "usr_lucas", renewalIn: 100, lastContact: 13, usage: 58, tickets: 1, critical: 0, payment: "em_dia", nps: 6, tags: ["Renovação 90d"], contractMonths: 8 },
  { name: "Único Pay", segment: "Financeiro", size: "media", city: "São Paulo", state: "SP", plan: "Growth", mrr: 11200, status: "em_risco", owner: "usr_beatriz", renewalIn: 64, lastContact: 29, usage: 47, tickets: 3, critical: 1, payment: "em_dia", nps: 5, tags: ["Concorrente", "Renovação 90d"], contractMonths: 14 },
  { name: "Vento Norte", segment: "Turismo", size: "pequena", city: "São Luís", state: "MA", plan: "Starter", mrr: 2600, status: "ativo", owner: "usr_marina", renewalIn: 150, lastContact: 19, usage: 55, tickets: 0, critical: 0, payment: "em_dia", nps: 6, tags: [], contractMonths: 7 },
  { name: "Weblar", segment: "Tecnologia", size: "media", city: "Fortaleza", state: "CE", plan: "Growth", mrr: 6800, status: "ativo", owner: "usr_lucas", renewalIn: 185, lastContact: 15, usage: 77, tickets: 1, critical: 0, payment: "em_dia", nps: 8, tags: [], contractMonths: 15 },
  { name: "Xamã Games", segment: "Tecnologia", size: "pequena", city: "Recife", state: "PE", plan: "Starter", mrr: 3100, status: "onboarding", owner: "usr_beatriz", renewalIn: 330, lastContact: 4, usage: 52, tickets: 0, critical: 0, payment: "em_dia", nps: null, tags: ["Implantação"], contractMonths: 1 },
  { name: "Ybyrá Madeiras", segment: "Construção", size: "media", city: "Manaus", state: "AM", plan: "Growth", mrr: 5900, status: "ativo", owner: "usr_marina", renewalIn: 175, lastContact: 22, usage: 60, tickets: 0, critical: 0, payment: "em_dia", nps: 6, tags: [], contractMonths: 11 },
  { name: "Zênite Arquitetura", segment: "Imobiliário", size: "pequena", city: "Natal", state: "RN", plan: "Starter", mrr: 2700, status: "ativo", owner: "usr_lucas", renewalIn: 115, lastContact: 17, usage: 57, tickets: 0, critical: 0, payment: "em_dia", nps: 7, tags: [], contractMonths: 6 },
  { name: "Âmbar Joias", segment: "Moda", size: "pequena", city: "Fortaleza", state: "CE", plan: "Starter", mrr: 2100, status: "cancelado", owner: "usr_beatriz", renewalIn: -40, lastContact: 58, usage: 10, tickets: 1, critical: 0, payment: "atraso_longo", nps: 3, tags: ["Churn", "Preço"], canceledAgo: 40, reason: "preco", contractMonths: 12 },
  { name: "Brisa Hotelaria", segment: "Turismo", size: "media", city: "Salvador", state: "BA", plan: "Growth", mrr: 6400, status: "ativo", owner: "usr_marina", renewalIn: 130, lastContact: 5, usage: 83, tickets: 0, critical: 0, payment: "em_dia", nps: 9, tags: ["Expansão"], contractMonths: 18 },
  { name: "Cedro Advocacia", segment: "Jurídico", size: "media", city: "São Paulo", state: "SP", plan: "Growth", mrr: 4400, status: "ativo", owner: "usr_lucas", renewalIn: 105, lastContact: 20, usage: 62, tickets: 0, critical: 0, payment: "em_dia", nps: 7, tags: [], contractMonths: 10 },
  { name: "Diamante Mineração", segment: "Mineração", size: "grande", city: "Belo Horizonte", state: "MG", plan: "Enterprise", mrr: 16800, status: "ativo", owner: "usr_beatriz", renewalIn: 240, lastContact: 7, usage: 86, tickets: 1, critical: 0, payment: "em_dia", nps: 8, tags: ["Estratégico"], contractMonths: 30 },
  { name: "Estrela Comunicação", segment: "Marketing", size: "pequena", city: "Recife", state: "PE", plan: "Starter", mrr: 2900, status: "cancelado", owner: "usr_marina", renewalIn: -90, lastContact: 110, usage: 5, tickets: 3, critical: 1, payment: "atraso_longo", nps: 2, tags: ["Churn", "Suporte"], canceledAgo: 90, reason: "falha_de_suporte", contractMonths: 8 },
  { name: "Farol Educação", segment: "Educação", size: "media", city: "Fortaleza", state: "CE", plan: "Growth", mrr: 5100, status: "em_risco", owner: "usr_lucas", renewalIn: 33, lastContact: 23, usage: 40, tickets: 2, critical: 0, payment: "atraso_curto", nps: 5, tags: ["Renovação 90d"], contractMonths: 13 },
  { name: "Gaia Wellness", segment: "Saúde", size: "pequena", city: "Natal", state: "RN", plan: "Starter", mrr: 2300, status: "ativo", owner: "usr_beatriz", renewalIn: 85, lastContact: 8, usage: 70, tickets: 0, critical: 0, payment: "em_dia", nps: 8, tags: ["Renovação 90d"], contractMonths: 7 },
  { name: "Hibisco Alimentos", segment: "Alimentos", size: "media", city: "João Pessoa", state: "PB", plan: "Growth", mrr: 4200, status: "onboarding", owner: "usr_marina", renewalIn: 340, lastContact: 6, usage: 28, tickets: 1, critical: 0, payment: "em_dia", nps: null, tags: ["Implantação", "Bloqueio"], contractMonths: 1 },
  { name: "Ipê Serviços", segment: "Serviços", size: "media", city: "São Paulo", state: "SP", plan: "Growth", mrr: 3800, status: "cancelado", owner: "usr_lucas", renewalIn: -130, lastContact: 140, usage: 6, tickets: 2, critical: 0, payment: "atraso_longo", nps: 3, tags: ["Churn", "Concorrente"], canceledAgo: 130, reason: "concorrente", contractMonths: 20 },
];

const mareSeeds: SeedCustomer[] = [
  { name: "Aurora Boreal", segment: "Tecnologia", size: "media", city: "São Paulo", state: "SP", plan: "Growth", mrr: 6800, status: "ativo", owner: "usr_bruno", renewalIn: 120, lastContact: 6, usage: 78, tickets: 0, critical: 0, payment: "em_dia", nps: 8, tags: ["Estratégico"], contractMonths: 16 },
  { name: "Cais Sul", segment: "Logística", size: "media", city: "Porto Alegre", state: "RS", plan: "Growth", mrr: 5400, status: "ativo", owner: "usr_clara", renewalIn: 90, lastContact: 14, usage: 66, tickets: 1, critical: 0, payment: "em_dia", nps: 7, tags: [], contractMonths: 11 },
  { name: "Duna Tech", segment: "Tecnologia", size: "pequena", city: "Florianópolis", state: "SC", plan: "Starter", mrr: 2400, status: "em_risco", owner: "usr_bruno", renewalIn: 35, lastContact: 32, usage: 36, tickets: 2, critical: 0, payment: "atraso_curto", nps: 4, tags: ["Renovação 90d"], contractMonths: 9 },
  { name: "Estação Saúde", segment: "Saúde", size: "media", city: "Curitiba", state: "PR", plan: "Growth", mrr: 6100, status: "ativo", owner: "usr_clara", renewalIn: 160, lastContact: 4, usage: 84, tickets: 0, critical: 0, payment: "em_dia", nps: 9, tags: ["Expansão"], contractMonths: 20 },
  { name: "Floresta Viva", segment: "Agronegócio", size: "media", city: "Cuiabá", state: "MT", plan: "Growth", mrr: 4900, status: "onboarding", owner: "usr_bruno", renewalIn: 320, lastContact: 2, usage: 32, tickets: 1, critical: 0, payment: "em_dia", nps: null, tags: ["Implantação"], contractMonths: 1 },
  { name: "Golfo Energia", segment: "Energia", size: "grande", city: "Rio de Janeiro", state: "RJ", plan: "Enterprise", mrr: 14200, status: "ativo", owner: "usr_helena", renewalIn: 200, lastContact: 9, usage: 88, tickets: 1, critical: 0, payment: "em_dia", nps: 9, tags: ["Estratégico"], contractMonths: 28 },
  { name: "Horizonte Azul", segment: "Turismo", size: "pequena", city: "Natal", state: "RN", plan: "Starter", mrr: 2100, status: "ativo", owner: "usr_clara", renewalIn: 70, lastContact: 15, usage: 60, tickets: 0, critical: 0, payment: "em_dia", nps: 7, tags: ["Renovação 90d"], contractMonths: 8 },
  { name: "Ilha Digital", segment: "Marketing", size: "media", city: "Recife", state: "PE", plan: "Growth", mrr: 4300, status: "em_risco", owner: "usr_bruno", renewalIn: 42, lastContact: 37, usage: 41, tickets: 2, critical: 1, payment: "atraso_curto", nps: 4, tags: ["Sem contato"], contractMonths: 12 },
  { name: "Jardim Escola", segment: "Educação", size: "pequena", city: "Fortaleza", state: "CE", plan: "Starter", mrr: 1900, status: "ativo", owner: "usr_clara", renewalIn: 110, lastContact: 11, usage: 72, tickets: 0, critical: 0, payment: "em_dia", nps: 8, tags: [], contractMonths: 7 },
  { name: "Lagoa Imóveis", segment: "Imobiliário", size: "media", city: "Salvador", state: "BA", plan: "Growth", mrr: 3800, status: "ativo", owner: "usr_bruno", renewalIn: 95, lastContact: 8, usage: 65, tickets: 1, critical: 0, payment: "em_dia", nps: 7, tags: [], contractMonths: 10 },
  { name: "Monte Verde", segment: "Alimentos", size: "pequena", city: "Belo Horizonte", state: "MG", plan: "Starter", mrr: 1700, status: "em_risco", owner: "usr_clara", renewalIn: 25, lastContact: 28, usage: 39, tickets: 1, critical: 0, payment: "em_dia", nps: 5, tags: ["Renovação 90d"], contractMonths: 6 },
  { name: "Nuvem Certa", segment: "Tecnologia", size: "media", city: "São Paulo", state: "SP", plan: "Growth", mrr: 7200, status: "ativo", owner: "usr_helena", renewalIn: 180, lastContact: 5, usage: 81, tickets: 0, critical: 0, payment: "em_dia", nps: 9, tags: ["Estratégico", "Expansão"], contractMonths: 22 },
  { name: "Onda Marketing", segment: "Marketing", size: "pequena", city: "Recife", state: "PE", plan: "Starter", mrr: 2000, status: "cancelado", owner: "usr_bruno", renewalIn: -55, lastContact: 70, usage: 9, tickets: 2, critical: 0, payment: "atraso_longo", nps: 2, tags: ["Churn"], canceledAgo: 55, reason: "falta_de_uso", contractMonths: 8 },
  { name: "Ponta Verde", segment: "Construção", size: "media", city: "Maceió", state: "AL", plan: "Growth", mrr: 3600, status: "ativo", owner: "usr_clara", renewalIn: 140, lastContact: 18, usage: 63, tickets: 0, critical: 0, payment: "em_dia", nps: 7, tags: [], contractMonths: 9 },
  { name: "Quatro Ventos", segment: "Consultoria", size: "pequena", city: "São Paulo", state: "SP", plan: "Starter", mrr: 1800, status: "cancelado", owner: "usr_helena", renewalIn: -100, lastContact: 120, usage: 4, tickets: 1, critical: 0, payment: "atraso_longo", nps: 3, tags: ["Churn"], canceledAgo: 100, reason: "concorrente", contractMonths: 14 },
];

/* -------------------------------------------------------------------------- */
/* Generation                                                                 */
/* -------------------------------------------------------------------------- */

function makeCnpj() {
  const digits = Array.from({ length: 14 }, () => randInt(0, 9)).join("");
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function makePhone() {
  return `(${randInt(11, 99)}) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`;
}

function customerFromSeed(seed: SeedCustomer, orgId: string, index: number): Customer {
  const slug = slugify(seed.name);
  const owner = users.find((user) => user.name === seed.owner)?.id ?? users[0].id;
  const contractStart = isoMonthsAgo(seed.contractMonths ?? 12);
  return {
    id: `cus_${orgId.slice(4)}_${slug}`,
    orgId,
    legalName: `${seed.name} ${seed.size === "pequena" ? "Ltda" : "S.A."}`,
    tradeName: seed.name,
    document: makeCnpj(),
    segment: seed.segment,
    size: seed.size,
    city: seed.city,
    state: seed.state,
    website: `www.${slug}.com.br`,
    plan: seed.plan,
    mrr: seed.mrr,
    status: seed.status,
    ownerId: owner,
    contractStart,
    renewalDate: isoDaysFromNow(seed.renewalIn),
    canceledAt: seed.canceledAgo != null ? isoDaysAgo(seed.canceledAgo) : undefined,
    cancelReason: seed.reason,
    tags: seed.tags,
    archived: false,
    createdAt: contractStart,
    updatedAt: isoDaysAgo(randInt(1, 12)),
    usageIndex: seed.usage,
    openTickets: seed.tickets,
    criticalTickets: seed.critical,
    paymentStatus: seed.payment,
    nps: seed.nps,
    lastContactAt: isoDaysAgo(seed.lastContact, randInt(9, 17)),
    logoColor: COLORS[index % COLORS.length],
  };
}

function makeContacts(customer: Customer): Contact[] {
  const count = customer.size === "grande" ? 3 : 2;
  const slug = slugify(customer.tradeName);
  return Array.from({ length: count }, (_, index) => {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const [first, last] = name.toLowerCase().split(" ");
    return {
      id: `con_${customer.id.slice(4)}_${index + 1}`,
      orgId: customer.orgId,
      customerId: customer.id,
      name,
      jobTitle: index === 0 ? "Patrocinador executivo" : pick(JOB_TITLES),
      email: `${first}.${last}@${slug}.com.br`,
      phone: makePhone(),
      isPrimary: index === 0,
      isDecisionMaker: index === 0 || (customer.size === "grande" && index === 1),
    };
  });
}

function makeInteractions(customer: Customer, contacts: Contact[], index: number): Interaction[] {
  const count = customer.status === "ativo" ? randInt(5, 7) : customer.status === "cancelado" ? randInt(3, 5) : randInt(4, 6);
  const types: InteractionType[] = ["reuniao", "email", "ligacao", "mensagem", "visita", "nota"];
  const sentimentPool: Sentiment[] =
    customer.status === "em_risco"
      ? ["negativo", "negativo", "neutro", "positivo"]
      : customer.status === "cancelado"
        ? ["negativo", "negativo", "neutro"]
        : customer.status === "onboarding"
          ? ["neutro", "positivo", "neutro"]
          : ["positivo", "positivo", "neutro", "negativo"];
  const owner = users.find((user) => user.id === customer.ownerId) ?? users[0];
  const baseDays = customer.lastContactAt ? Math.max(0, Math.round((Date.now() - +new Date(customer.lastContactAt)) / 86_400_000)) : 0;

  const items: Interaction[] = [];
  let cursor = baseDays;
  for (let i = 0; i < count; i += 1) {
    const type = i === 0 && customer.status !== "onboarding" ? "reuniao" : types[(i + index) % types.length];
    const sentiment = type === "nota" ? "neutro" : sentimentPool[(i + index) % sentimentPool.length];
    const date = isoDaysAgo(cursor, randInt(9, 17));
    const contact = contacts[i % contacts.length];
    items.push({
      id: `int_${customer.id.slice(4)}_${i + 1}`,
      orgId: customer.orgId,
      customerId: customer.id,
      type,
      occurredAt: date,
      subject: pick(INTERACTION_SUBJECTS[type]),
      summary: pick(SUMMARIES[sentiment]),
      sentiment,
      nextSteps: type === "nota" ? "" : pick(NEXT_STEPS),
      participants: [contact?.name ?? "Contato principal", owner.name],
      createdBy: owner.id,
      source: i === 0 && index % 5 === 0 ? "mcp" : "ui",
    });
    cursor += randInt(18, 48);
  }

  if (customer.tradeName === "Alfa Logística") {
    const alfaSubjects = [
      { type: "reuniao" as InteractionType, subject: "QBR — revisão de resultados", sentiment: "negativo" as Sentiment, summary: "Uso caiu 42% no trimestre e o patrocinador não participou da reunião. Cliente sinalizou insatisfação com a integração do WMS.", nextSteps: "Escalar plano de recuperação para a diretoria até sexta." },
      { type: "email" as InteractionType, subject: "Follow-up de tickets críticos", sentiment: "negativo" as Sentiment, summary: "Dois tickets críticos seguem abertos há mais de 10 dias. Cliente cobrou previsão de correção.", nextSteps: "Enviar cronograma técnico revisado." },
      { type: "ligacao" as InteractionType, subject: "Alinhamento com patrocinador", sentiment: "neutro" as Sentiment, summary: "Patrocinador está de férias; interlocutor operacional não tem autonomia para tratar a renovação.", nextSteps: "Identificar novo patrocinador executivo." },
      { type: "reuniao" as InteractionType, subject: "Reunião de renovação antecipada", sentiment: "negativo" as Sentiment, summary: "Cliente abriu concorrência para o contrato de logística e pediu redução de 18% no valor.", nextSteps: "Preparar cenário de retenção com o comercial." },
      { type: "reuniao" as InteractionType, subject: "Workshop de melhores práticas", sentiment: "positivo" as Sentiment, summary: "Workshop teve boa adesão do time operacional e gerou dois novos casos de uso.", nextSteps: "Mapear expansão para o próximo ciclo." },
    ];
    return alfaSubjects.map((item, i) => ({
      id: `int_alfa_${i + 1}`,
      orgId: customer.orgId,
      customerId: customer.id,
      type: item.type,
      occurredAt: isoDaysAgo([47, 62, 78, 95, 120][i], 11),
      subject: item.subject,
      summary: item.summary,
      sentiment: item.sentiment,
      nextSteps: item.nextSteps,
      participants: [contacts[0]?.name ?? "Contato", owner.name],
      createdBy: owner.id,
      source: i < 2 ? "mcp" : "ui",
    }));
  }

  if (customer.tradeName === "Coração Varejo") {
    return [
      {
        id: "int_coracao_1",
        orgId: customer.orgId,
        customerId: customer.id,
        type: "reuniao",
        occurredAt: isoDaysAgo(3, 10),
        subject: "Reunião de expansão — módulo de fidelidade",
        summary: "Cliente apresentou caso de negócio para o módulo de fidelidade e pediu proposta para 3 lojas adicionais.",
        sentiment: "positivo",
        nextSteps: "Enviar proposta de upsell até quinta.",
        participants: [contacts[0]?.name ?? "Contato", owner.name],
        createdBy: owner.id,
        source: "ui",
      },
      {
        id: "int_coracao_2",
        orgId: customer.orgId,
        customerId: customer.id,
        type: "reuniao",
        occurredAt: isoDaysAgo(10, 15),
        subject: "QBR — resultados do trimestre",
        summary: "NPS 9 e uso 88. Cliente destacou ganho de 22% na conversão das lojas.",
        sentiment: "positivo",
        nextSteps: "Convidar para o case de sucesso.",
        participants: [contacts[0]?.name ?? "Contato", owner.name],
        createdBy: owner.id,
        source: "ui",
      },
      ...items.slice(2),
    ];
  }

  if (customer.tradeName === "Beta Saúde") {
    return items.map((item, i) => ({
      ...item,
      subject: i === 0 ? "Alinhamento sobre integração de dados" : item.subject,
      summary:
        i === 0
          ? "Integração com o prontuário eletrônico está bloqueada há 12 dias por falta de acesso ao ambiente do cliente."
          : item.summary,
      sentiment: i === 0 ? "neutro" : item.sentiment,
    }));
  }

  return items;
}

const ONBOARDING_NAMES = [
  "Kickoff",
  "Coleta de requisitos",
  "Configuração",
  "Integração de dados",
  "Treinamento",
  "Go-live",
  "Acompanhamento 30 dias",
];

function makeOnboardingSteps(customer: Customer, orgId: string, ownerId: string): OnboardingStep[] {
  const isOnboarding = customer.status === "onboarding";
  const isRecentActive = customer.status === "ativo" && +new Date(customer.contractStart) > Date.now() - 1000 * 60 * 60 * 24 * 200;
  if (!isOnboarding && !isRecentActive) return [];

  const start = new Date(customer.contractStart);
  const days = [0, 7, 14, 21, 28, 35, 65];
  const statusFor = (index: number): OnboardingStep["status"] => {
    if (!isOnboarding) return "concluida";
    if (customer.tradeName === "Beta Saúde") {
      if (index < 3) return "concluida";
      if (index === 3) return "em_andamento";
      return "pendente";
    }
    if (customer.tradeName === "Hibisco Alimentos") {
      if (index === 0) return "concluida";
      if (index === 1) return "bloqueada";
      return "pendente";
    }
    if (customer.tradeName === "Maré Digital") {
      if (index < 2) return "concluida";
      if (index === 2) return "em_andamento";
      return "pendente";
    }
    if (index < 4) return "concluida";
    if (index === 4) return "em_andamento";
    return "pendente";
  };

  return ONBOARDING_NAMES.map((name, index) => {
    const status = statusFor(index);
    const due = new Date(start);
    due.setDate(due.getDate() + days[index]);
    const isDone = status === "concluida";
    const overdue = !isDone && due < new Date();
    return {
      id: `onb_${customer.id.slice(4)}_${index + 1}`,
      orgId,
      customerId: customer.id,
      position: index,
      name,
      ownerId,
      dueDate: due.toISOString(),
      completedAt: isDone ? new Date(due.getTime() - 86_400_000).toISOString() : undefined,
      status,
      blockedReason:
        status === "bloqueada"
          ? "Aguardando liberação de acesso ao ERP do cliente."
          : undefined,
      notes: overdue && !isDone ? "Etapa fora do prazo — escalar com o patrocinador." : undefined,
    };
  });
}

function makeHistory(customer: Customer, current: ReturnType<typeof computeHealth>, settings: OrgSettings): HealthScore[] {
  const points: HealthScore[] = [];
  const explicit = customer.tradeName === "Alfa Logística" ? [75, 76, 74, 77, 76, 75, 73, 72, 70, 82, 63, 44] : null;
  for (let i = 0; i < 12; i += 1) {
    const date = new Date(isoMonthsAgo(11 - i));
    date.setDate(15);
    date.setHours(12, 0, 0, 0);
    let score: number;
    if (explicit) {
      score = explicit[i];
    } else if (i === 11) {
      score = current.score;
    } else {
      const distance = 11 - i;
      if (customer.status === "em_risco") score = Math.min(100, current.score + distance * 4 + randInt(-3, 3));
      else if (customer.status === "cancelado") score = Math.min(100, current.score + distance * 5 + randInt(-2, 2));
      else if (customer.status === "onboarding") score = Math.max(20, current.score - distance * 2 + randInt(-3, 3));
      else score = Math.max(45, current.score + randInt(-6, 6));
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    points.push({
      id: `hsc_${customer.id.slice(4)}_${i + 1}`,
      orgId: customer.orgId,
      customerId: customer.id,
      calculatedAt: date.toISOString(),
      score,
      band: bandOf(score, settings.healthyThreshold, settings.attentionThreshold),
      components: current.components,
      topFactors: current.topFactors,
    });
  }
  return points;
}

function makeOpportunities(customers: Customer[], orgId: string): Opportunity[] {
  const byName = new Map(customers.map((customer) => [customer.tradeName, customer]));
  const owner = (name: string) => users.find((user) => user.name === name)?.id ?? users[0].id;
  const defs: Array<[string, Opportunity["type"], string, number, number, Opportunity["stage"], number, string]> = [
    ["Alfa Logística", "renovacao", "Renovação Enterprise 2027", 226800, 40, "proposta", 45, "Camila Torres"],
    ["Coração Varejo", "upsell", "Módulo de fidelidade — 3 lojas", 24000, 60, "em_conversa", 30, "Camila Torres"],
    ["Beta Saúde", "cross_sell", "Módulo de analytics clínico", 12000, 30, "identificada", 75, "Camila Torres"],
    ["Aurora Financeira", "upsell", "Expansão para 120 seats", 48000, 70, "proposta", 55, "Camila Torres"],
    ["Cais Engenharia", "renovacao", "Renovação Enterprise 2027", 252000, 55, "em_conversa", 88, "Camila Torres"],
    ["Duna Cosméticos", "renovacao", "Renovação Growth", 82800, 45, "proposta", 28, "Camila Torres"],
    ["Fênix Seguros", "upsell", "Módulo de auditoria", 36000, 35, "identificada", 60, "Camila Torres"],
    ["Oceano Logística", "renovacao", "Renovação Enterprise", 182400, 50, "proposta", 39, "Camila Torres"],
    ["Único Pay", "cross_sell", "Integração antifraude", 18000, 40, "em_conversa", 64, "Camila Torres"],
    ["Sol Nascente", "upsell", "Expansão de storage", 30000, 100, "ganha", -5, "Camila Torres"],
    ["Íris Tecnologia", "renovacao", "Renovação Growth", 110400, 65, "em_conversa", 70, "Camila Torres"],
    ["Horizonte Imóveis", "indicacao", "Indicação — Grupo Litoral", 6000, 25, "identificada", 40, "Camila Torres"],
    ["Farol Educação", "renovacao", "Renovação Growth", 61200, 35, "proposta", 33, "Camila Torres"],
    ["Norte Solar", "cross_sell", "Módulo de medição", 15000, 30, "identificada", 90, "Camila Torres"],
    ["Brisa Hotelaria", "upsell", "Pacote de 5 unidades", 12000, 100, "ganha", -12, "Camila Torres"],
    ["Golfo Energia", "upsell", "Expansão Enterprise", 54000, 55, "em_conversa", 120, "Helena Costa"],
    ["Nuvem Certa", "cross_sell", "Módulo de observabilidade", 21000, 45, "proposta", 80, "Helena Costa"],
    ["Duna Tech", "renovacao", "Renovação Starter", 28800, 30, "identificada", 35, "Bruno Sá"],
  ];
  return defs
    .map(([name, type, title, value, probability, stage, expected, ownerName], index) => {
      const customer = byName.get(name);
      if (!customer || customer.orgId !== orgId) return null;
      return {
        id: `opo_${orgId.slice(4)}_${index + 1}`,
        orgId,
        customerId: customer.id,
        type,
        title,
        value,
        probability,
        stage,
        expectedClose: isoDaysFromNow(expected),
        ownerId: owner(ownerName),
        createdAt: isoDaysAgo(randInt(10, 80)),
      } satisfies Opportunity;
    })
    .filter((item): item is Opportunity => Boolean(item));
}

function makeRisks(customers: Customer[], orgId: string): Risk[] {
  const byName = new Map(customers.map((customer) => [customer.tradeName, customer]));
  const defs: Array<[string, string, Risk["severity"], string, string, Risk["status"]]> = [
    ["Alfa Logística", "Engajamento", "critica", "Uso caiu 42% no trimestre e o patrocinador executivo está ausente.", "Plano de recuperação com diretoria + revisão de integração WMS.", "mitigando"],
    ["Duna Cosméticos", "Financeiro", "alta", "Atraso recorrente e renovação em 28 dias sem proposta aprovada.", "Negociar parcelamento e envolver o comercial.", "aberto"],
    ["Fênix Seguros", "Suporte", "critica", "Dois tickets críticos abertos há mais de 9 dias.", "Escalar para engenharia e comunicar prazo ao cliente.", "mitigando"],
    ["Oceano Logística", "Relacionamento", "alta", "Sem contato há 38 dias e renovação em 39 dias.", "Retomar contato esta semana com plano de valor.", "aberto"],
    ["Único Pay", "Concorrência", "alta", "Cliente avaliando concorrente para o módulo financeiro.", "Preparar comparativo e proposta de retenção.", "aberto"],
    ["Jasmim Moda", "Adoção", "media", "Baixo uso do módulo de relatórios (38/100).", "Treinamento focado em relatórios.", "aberto"],
    ["Farol Educação", "Renovação", "alta", "Renovação em 33 dias sem proposta formal.", "Enviar proposta e alinhar patrocinador.", "aberto"],
    ["Beta Saúde", "Implantação", "media", "Integração de dados bloqueada por falta de acesso ao ERP.", "Escalar acesso com TI do cliente.", "mitigando"],
    ["Delta Educação", "Churn", "alta", "Cancelamento por falta de uso após 3 meses de queda.", "Registrar aprendizado e plano de win-back.", "resolvido"],
    ["Quinta Essência", "Churn", "media", "Fim de projeto sem renovação.", "Manter relacionamento para novo ciclo.", "resolvido"],
  ];
  return defs
    .map(([name, category, severity, description, actionPlan, status], index) => {
      const customer = byName.get(name);
      if (!customer || customer.orgId !== orgId) return null;
      return {
        id: `rsk_${orgId.slice(4)}_${index + 1}`,
        orgId,
        customerId: customer.id,
        category,
        severity,
        description,
        actionPlan,
        status,
        createdAt: isoDaysAgo(randInt(2, 30)),
      } satisfies Risk;
    })
    .filter((item): item is Risk => Boolean(item));
}

function makeTasks(customers: Customer[], orgId: string): Task[] {
  const byName = new Map(customers.map((customer) => [customer.tradeName, customer]));
  const owner = (name: string) => users.find((user) => user.name === name)?.id ?? users[0].id;
  const subtaskTitles: Record<string, string[]> = {
    "Montar plano de retenção e alinhar com a diretoria": [
      "Levantar motivos de risco com o cliente",
      "Desenhar plano de ação",
      "Alinhar com a diretoria",
    ],
    "Reagendar QBR com patrocinador executivo": [
      "Confirmar agenda do patrocinador",
      "Preparar pauta da QBR",
    ],
    "Revisar cronograma de integração": [
      "Validar dependências do ERP",
      "Revisar marcos com o cliente",
    ],
    "Preparar comparativo competitivo": [
      "Coletar preços dos concorrentes",
      "Montar tabela comparativa",
    ],
  };
  const defs: Array<[string, string, number, Task["priority"], Task["status"], string, Task["source"]]> = [
    ["Alfa Logística", "Montar plano de retenção e alinhar com a diretoria", -2, "alta", "aberta", "Marina Alves", "ui"],
    ["Alfa Logística", "Reagendar QBR com patrocinador executivo", 1, "alta", "aberta", "Marina Alves", "ui"],
    ["Beta Saúde", "Cobrar liberação de acesso ao ERP", -1, "alta", "aberta", "Lucas Prado", "ui"],
    ["Beta Saúde", "Revisar cronograma de integração", 2, "media", "em_andamento", "Lucas Prado", "mcp"],
    ["Oceano Logística", "Ligar para retomar relacionamento", 0, "alta", "aberta", "Beatriz Lima", "ui"],
    ["Fênix Seguros", "Escalar tickets críticos com engenharia", 0, "alta", "aberta", "Beatriz Lima", "ui"],
    ["Duna Cosméticos", "Enviar proposta de renovação revisada", 1, "alta", "em_andamento", "Marina Alves", "ui"],
    ["Coração Varejo", "Enviar proposta de upsell do módulo de fidelidade", 3, "media", "aberta", "Marina Alves", "ui"],
    ["Único Pay", "Preparar comparativo competitivo", 4, "alta", "aberta", "Beatriz Lima", "ui"],
    ["Farol Educação", "Formalizar proposta de renovação", 2, "alta", "em_andamento", "Lucas Prado", "ui"],
    ["Aurora Financeira", "Agendar workshop de expansão", 7, "media", "aberta", "Marina Alves", "ui"],
    ["Cais Engenharia", "Revisar escopo da renovação", 8, "media", "aberta", "Lucas Prado", "ui"],
    ["Norte Solar", "Retomar contato e mapear uso", 5, "media", "aberta", "Lucas Prado", "playbook"],
    ["Rota Certa", "Check-in de relacionamento", 6, "baixa", "aberta", "Beatriz Lima", "ui"],
    ["Jasmim Moda", "Treinamento de relatórios", 10, "media", "aberta", "Marina Alves", "ui"],
    ["Íris Tecnologia", "Preparar proposta de renovação", 12, "media", "aberta", "Beatriz Lima", "ui"],
    ["Girassol Agro", "Revisar metas de uso do trimestre", 14, "baixa", "aberta", "Marina Alves", "ui"],
    ["Hibisco Alimentos", "Desbloquear coleta de requisitos", 1, "alta", "em_andamento", "Marina Alves", "ui"],
    ["Sol Nascente", "Registrar expansão ganha no CRM", -3, "media", "concluida", "Marina Alves", "ui"],
    ["Brisa Hotelaria", "Enviar contrato de upsell", -5, "media", "concluida", "Marina Alves", "ui"],
    ["Golfo Energia", "Mapear caso de uso de expansão", 20, "baixa", "aberta", "Helena Costa", "ui"],
    ["Nuvem Certa", "Revisar proposta de observabilidade", 15, "media", "aberta", "Helena Costa", "mcp"],
  ];
  return defs
    .map(([name, title, due, priority, status, ownerName, source], index) => {
      const customer = byName.get(name);
      if (!customer || customer.orgId !== orgId) return null;
      return {
        id: `tsk_${orgId.slice(4)}_${index + 1}`,
        orgId,
        customerId: customer.id,
        title,
        dueDate: isoDaysFromNow(due, 18),
        priority,
        status,
        assigneeId: owner(ownerName),
        createdAt: isoDaysAgo(randInt(1, 20)),
        source,
        position: index,
        subtasks: (subtaskTitles[title] ?? []).map((subtaskTitle, subIndex) => ({
          id: `sub_${orgId.slice(4)}_${index + 1}_${subIndex + 1}`,
          title: subtaskTitle,
          done: subIndex === 0,
          createdAt: isoDaysAgo(randInt(1, 10)),
        })),
      } satisfies Task;
    })
    .filter((item) => item !== null);
}

function makeTokens(orgId: string, userId: string, label: string, scopes: string[], revoked = false): McpToken {
  return {
    id: `tok_${orgId.slice(4)}_${slugify(label)}`,
    orgId,
    userId,
    label,
    tokenPreview: `nxr_live_••••${Math.random().toString(16).slice(2, 6)}`,
    scopes,
    expiresAt: isoDaysFromNow(90),
    revokedAt: revoked ? isoDaysAgo(5) : undefined,
    lastUsedAt: revoked ? isoDaysAgo(6) : isoDaysAgo(0, 8),
    createdAt: isoDaysAgo(revoked ? 30 : 12),
  };
}

function makeAudit(orgId: string, customers: Customer[], tokens: McpToken[]): AuditEntry[] {
  const base: AuditEntry[] = [];
  const actions = [
    ["auth.login", "user", "session", "Login realizado com sessão segura"],
    ["customer.updated", "user", "customer", "Status do cliente atualizado"],
    ["interaction.created", "user", "interaction", "Contato registrado pela interface"],
    ["score.recalculated", "system", "health_score", "Health score recalculado"],
    ["mcp.tool_call", "mcp", "mcp_tool", "buscar_clientes executada via MCP"],
    ["mcp.tool_call", "mcp", "mcp_tool", "obter_cliente_360 executada via MCP"],
    ["task.created", "user", "task", "Tarefa criada a partir de reunião"],
    ["token.created", "user", "mcp_token", "Token de IA criado com escopos de leitura"],
  ];
  for (let i = 0; i < 42; i += 1) {
    const [action, kind, entity, description] = actions[i % actions.length];
    const customer = customers[(i * 3) % customers.length];
    const token = tokens[i % tokens.length];
    base.push({
      id: `aud_${orgId.slice(4)}_${i + 1}`,
      orgId,
      at: isoDaysAgo(i < 20 ? i : randInt(1, 30), randInt(8, 20)),
      actorUserId: kind === "system" ? undefined : users.find((user) => user.orgId === orgId)?.id,
      actorKind: kind as AuditEntry["actorKind"],
      tokenId: kind === "mcp" ? token?.id : undefined,
      action,
      entity,
      entityId: customer?.id,
      details: {
        description,
        customer: customer?.tradeName,
        ip: `191.36.${randInt(1, 250)}.${randInt(1, 250)}`,
        result: "success",
      },
    });
  }
  return base;
}

/* -------------------------------------------------------------------------- */
/* Main seed                                                                  */
/* -------------------------------------------------------------------------- */

export function createInitialState(): AppState {
  const settings: Record<string, OrgSettings> = {
    org_orbita: defaultSettings(),
    org_mare: defaultSettings(),
  };

  const customers: Customer[] = [
    ...orbitaSeeds.map((seed, index) => customerFromSeed(seed, "org_orbita", index)),
    ...mareSeeds.map((seed, index) => customerFromSeed(seed, "org_mare", index)),
  ];

  const contacts: Contact[] = customers.flatMap((customer) => makeContacts(customer));
  const interactions: Interaction[] = customers.flatMap((customer, index) => {
    const customerContacts = contacts.filter((contact) => contact.customerId === customer.id);
    return makeInteractions(customer, customerContacts, index);
  });
  const onboardingSteps: OnboardingStep[] = customers.flatMap((customer) =>
    makeOnboardingSteps(customer, customer.orgId, customer.ownerId),
  );

  const scores: HealthScore[] = [];
  for (const customer of customers) {
    const customerInteractions = interactions.filter((item) => item.customerId === customer.id);
    const customerSteps = onboardingSteps.filter((item) => item.customerId === customer.id);
    const current = computeHealth(customer, customerInteractions, customerSteps, settings[customer.orgId]);
    scores.push(...makeHistory(customer, current, settings[customer.orgId]));
  }

  const opportunities = [...makeOpportunities(customers.filter((c) => c.orgId === "org_orbita"), "org_orbita"), ...makeOpportunities(customers, "org_mare")];
  const risks = [...makeRisks(customers.filter((c) => c.orgId === "org_orbita"), "org_orbita"), ...makeRisks(customers, "org_mare")];
  const tasks = [...makeTasks(customers.filter((c) => c.orgId === "org_orbita"), "org_orbita"), ...makeTasks(customers, "org_mare")];

  const tokens: McpToken[] = [
    makeTokens("org_orbita", "usr_marina", "Claude · CS Ops", ["read:customers", "read:interactions", "read:health", "read:dashboard", "write:interactions", "write:tasks"]),
    makeTokens("org_orbita", "usr_diego", "Dashboard semanal", ["read:customers", "read:health", "read:dashboard"], true),
    makeTokens("org_mare", "usr_helena", "Claude · Maré", ["read:customers", "read:interactions", "read:health", "read:dashboard"]),
  ];

  const audit = [...makeAudit("org_orbita", customers.filter((c) => c.orgId === "org_orbita"), tokens.filter((t) => t.orgId === "org_orbita")), ...makeAudit("org_mare", customers.filter((c) => c.orgId === "org_mare"), tokens.filter((t) => t.orgId === "org_mare"))];

  return {
    version: 1,
    orgs: [orgOrbita, orgMare],
    users,
    customers,
    contacts,
    interactions,
    onboardingSteps,
    scores,
    opportunities,
    risks,
    tasks,
    tokens,
    audit,
    settings,
    session: null,
  };
}

export const DEMO_ORGS = [orgOrbita, orgMare];
