import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { useRoute } from "@/lib/router";
import { AppShell } from "@/components/shell/app-shell";
import { LoginPage } from "@/pages/login-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { CustomersPage } from "@/pages/customers-page";
import { CustomerDetailPage } from "@/pages/customer-detail-page";
import { OnboardingPage } from "@/pages/onboarding-page";
import { OpportunitiesPage } from "@/pages/opportunities-page";
import { TasksPage } from "@/pages/tasks-page";
import { AiPage } from "@/pages/ai-page";
import { SettingsPage } from "@/pages/settings-page";
import { AuditPage } from "@/pages/audit-page";

function CurrentPage() {
  const route = useRoute();
  const root = route.segments[0] ?? "dashboard";

  switch (root) {
    case "clientes":
      return route.segments[1] ? (
        <CustomerDetailPage customerId={route.segments[1]} />
      ) : (
        <CustomersPage />
      );
    case "onboarding":
      return <OnboardingPage />;
    case "oportunidades":
      return <OpportunitiesPage />;
    case "tarefas":
      return <TasksPage />;
    case "ia":
      return <AiPage />;
    case "configuracoes":
      return <SettingsPage />;
    case "auditoria":
      return <AuditPage />;
    case "dashboard":
    default:
      return <DashboardPage />;
  }
}

export default function App() {
  const { session } = useApp();
  const route = useRoute();

  useEffect(() => {
    document.documentElement.lang = "pt-BR";
    if (!window.location.hash) window.history.replaceState(null, "", "#/dashboard");
  }, []);

  useEffect(() => {
    const titles: Record<string, string> = {
      dashboard: "Dashboard",
      clientes: "Clientes",
      onboarding: "Onboarding",
      oportunidades: "Oportunidades",
      tarefas: "Tarefas",
      ia: "IA & MCP",
      configuracoes: "Configurações",
      auditoria: "Auditoria",
    };
    const root = route.segments[0] ?? "dashboard";
    document.title = `${titles[root] ?? "Dashboard"} · Nexora`;
  }, [route.path, route.segments]);

  if (!session) return <LoginPage />;

  return (
    <AppShell>
      <CurrentPage />
    </AppShell>
  );
}
