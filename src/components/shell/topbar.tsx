import { RiMenuLine, RiNotification3Line, RiSearchLine } from "@remixicon/react";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import { UserAvatar } from "@/components/nexora/misc";
import { Kbd } from "@/components/base/kbd/kbd";
import type { User } from "@/lib/types";

type TopbarProps = {
  user: User;
  section: string;
  page: string;
  alertCount: number;
  onOpenNav: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
};

export function Topbar({
  user,
  section,
  page,
  alertCount,
  onOpenNav,
  onOpenSearch,
  onOpenNotifications,
  onOpenProfile,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 -mx-1 px-1 pt-3 pb-2">
      <div className="glass-panel flex h-13 items-center gap-2 rounded-2xl px-2.5 py-2 sm:px-3">
        <button
          type="button"
          onClick={onOpenNav}
          className="grid size-9 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary lg:hidden"
          aria-label="Abrir navegação"
        >
          <RiMenuLine className="size-5" aria-hidden />
        </button>

        <div className="hidden min-w-0 items-center gap-1.5 text-[12px] sm:flex">
          <span className="text-text-tertiary">{section}</span>
          <span className="text-text-disabled">/</span>
          <span className="truncate font-medium text-text-primary">{page}</span>
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden h-9 w-[260px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 text-left text-text-tertiary transition-colors hover:border-white/20 hover:bg-white/[0.05] md:flex"
          aria-label="Buscar clientes e ações"
        >
          <RiSearchLine className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 truncate text-[12px]">Buscar clientes, ações…</span>
          <Kbd className="nx-kbd">Ctrl K</Kbd>
        </button>

        <button
          type="button"
          onClick={onOpenSearch}
          className="grid size-9 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary md:hidden"
          aria-label="Buscar"
        >
          <RiSearchLine className="size-5" aria-hidden />
        </button>

        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative grid size-9 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
          aria-label={`Notificações${alertCount ? `, ${alertCount} pendentes` : ""}`}
        >
          <RiNotification3Line className="size-5" aria-hidden />
          {alertCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#0e1524]">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          className="ml-0.5 rounded-full ring-2 ring-transparent transition-[box-shadow] hover:ring-accent-400/40"
          aria-label="Abrir menu do usuário"
        >
          <UserAvatar user={user} size="md" />
        </button>
      </div>
    </header>
  );
}
