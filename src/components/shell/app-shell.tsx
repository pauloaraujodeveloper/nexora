import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Drawer } from "@/components/base/drawer/drawer";
import { useApp, useOrgData } from "@/lib/store";
import { buildCustomerHealth } from "@/lib/selectors";
import { buildAlerts } from "@/lib/alerts";
import { daysUntil } from "@/lib/format";
import { navigate, useRoute } from "@/lib/router";
import { useMotionEnabled, usePageEnter } from "@/lib/motion";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandMenu } from "./command-menu";
import { NotificationsDrawer } from "./notifications-drawer";
import { findNavItem } from "./nav";

export function AppShell({ children }: { children: ReactNode }) {
  const { state, session, currentUser, currentOrg, settings, dispatch } = useApp();
  const data = useOrgData();
  const route = useRoute();
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const motion = useMotionEnabled(settings?.reduceMotion);
  const pageRef = usePageEnter(motion, route.path + route.query.toString());

  useEffect(() => {
    setNavOpen(false);
    setSearchOpen(false);
    setAlertsOpen(false);
  }, [route.path, route.query.toString()]);

  const health = useMemo(
    () =>
      settings
        ? buildCustomerHealth(
            data.customers,
            data.scores,
            data.interactions,
            data.onboardingSteps,
            settings,
            data.users,
          )
        : [],
    [data.customers, data.scores, data.interactions, data.onboardingSteps, data.users, settings],
  );

  const alerts = useMemo(
    () =>
      settings
        ? buildAlerts(health, data.interactions, data.onboardingSteps, data.opportunities, settings)
        : [],
    [health, data.interactions, data.onboardingSteps, data.opportunities, settings],
  );

  const nav = findNavItem(route.path);

  if (!session || !currentUser || !currentOrg) return null;

  const badges = {
    clientes: health.filter((item) => item.customer.status === "em_risco").length,
    onboarding: health.filter((item) => item.customer.status === "onboarding").length,
    oportunidades: data.opportunities.filter((item) => !["ganha", "perdida"].includes(item.stage)).length,
    tarefas: data.tasks.filter(
      (task) => task.status !== "concluida" && daysUntil(task.dueDate) <= 7,
    ).length,
  };

  const sidebar = (
    <Sidebar
      org={currentOrg}
      orgs={state.orgs}
      user={currentUser}
      activePath={route.path}
      badges={badges}
      isAdmin={session.role === "admin"}
      onSwitchOrg={(orgId) => {
        const target = state.users.find((user) => user.orgId === orgId && user.active);
        if (target) dispatch({ type: "switchOrg", orgId, userId: target.id });
      }}
      onLogout={() => dispatch({ type: "logout" })}
      onNavigate={() => setNavOpen(false)}
    />
  );

  return (
    <div className="nexora-shell relative min-h-dvh">
      <div className="nexora-grid" aria-hidden />
      <div className="nexora-aurora" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-[1640px] gap-0 px-2 py-2 sm:px-3">
        <div className="sticky top-2 hidden h-[calc(100dvh-1rem)] w-[256px] shrink-0 lg:block">
          {sidebar}
        </div>

        <div className="min-w-0 flex-1 px-1 sm:px-2">
          <Topbar
            user={currentUser}
            section={nav.group}
            page={nav.label}
            alertCount={alerts.filter((alert) => alert.severity === "critica" || alert.severity === "alta").length}
            onOpenNav={() => setNavOpen(true)}
            onOpenSearch={() => {
              setAlertsOpen(false);
              setSearchOpen(true);
            }}
            onOpenNotifications={() => {
              setSearchOpen(false);
              setAlertsOpen(true);
            }}
            onOpenProfile={() => navigate("configuracoes")}
          />
          <main ref={pageRef} className="pb-12">
            {children}
          </main>
        </div>
      </div>

      <Drawer
        isOpen={navOpen}
        onOpenChange={setNavOpen}
        placement="start"
        size="sm"
        aria-label="Navegação"
        className="bg-[#080d18] p-2"
      >
        {sidebar}
      </Drawer>

      <CommandMenu
        isOpen={searchOpen}
        onOpenChange={setSearchOpen}
        customers={data.customers}
        users={data.users}
        onOpenCustomer={(id) => navigate(`clientes/${id}`)}
      />

      <NotificationsDrawer
        isOpen={alertsOpen}
        onOpenChange={setAlertsOpen}
        alerts={alerts}
        onOpenCustomer={(id) => navigate(`clientes/${id}`)}
        onSeeTasks={() => navigate("tarefas")}
      />
    </div>
  );
}
