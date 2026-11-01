import { lazy, Suspense, useEffect } from "react";
import { useApp } from "@/lib/store";
import { navigate, useRoute } from "@/lib/router";
import { AppShell } from "@/components/shell/app-shell";
import { Spinner } from "@/components/base/spinner/spinner";
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

const AdminPanel = lazy(() => import("@/components/admin/admin-panel"));

function AdminRoute() {
  const { session } = useApp();
  const allowed = session?.role === "admin";

  useEffect(() => {
    if (!allowed) navigate("dashboard");
  }, [allowed]);

  if (!allowed) return null;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-text-secondary">
          <Spinner size="sm" aria-hidden />
          <span className="text-body-medium">Carregando administração…</span>
        </div>
      }
    >
      <AdminPanel />
    </Suspense>
  );
}

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
    case "admin":
      return <AdminRoute />;
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
      admin: "Admin",
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
