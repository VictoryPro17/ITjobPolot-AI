import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, LogOut, Palette, UserRound, X } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { navigationGroups, settingsNavigationItem, type NavigationBadge, type NavigationItem } from "@/config/navigation";
import { getSummary } from "@/features/applications/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { getAvatarUrl } from "@/features/auth/api";
import { getReminders } from "@/features/reminders/api";
import { cn } from "@/lib/utils";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/** Zaehler am Menuepunkt; nutzt dieselben Abfragen wie Dashboard und Erinnerungen. */
function useNavigationBadges(): Record<NavigationBadge, number | undefined> {
  const summary = useQuery({ queryKey: ["summary"], queryFn: getSummary });
  const reminders = useQuery({ queryKey: ["reminders", "nav"], queryFn: () => getReminders("Open"), staleTime: 60_000 });

  return {
    openApplications: summary.data?.open,
    overdueReminders: reminders.data?.filter((reminder) => reminder.isOverdue).length,
  };
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const badges = useNavigationBadges();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card",
          "transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Hauptnavigation"
      >
        <div className="flex h-16 items-center justify-between gap-2 px-5">
          <Link to="/" onClick={onClose} className="rounded-lg" aria-label="JobPilot – zum Dashboard">
            <Logo />
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose} aria-label="Navigation schließen">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Bereiche">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavItem item={item} count={item.badge ? badges[item.badge] : undefined} tone={item.badge === "overdueReminders" ? "danger" : "neutral"} onNavigate={onClose} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-border p-3">
          <NavItem item={settingsNavigationItem} onNavigate={onClose} />
          <UserMenu onNavigate={onClose} />
        </div>
      </aside>
    </>
  );
}

function NavItem({
  item,
  count,
  tone = "neutral",
  onNavigate,
}: {
  item: NavigationItem;
  count?: number;
  tone?: "neutral" | "danger";
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const showCount = count != null && count > 0;

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "bg-primary/10 text-primary-text" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-text" : "text-muted-foreground group-hover:text-foreground")} aria-hidden="true" />
          <span className="flex-1 truncate">{item.label}</span>
          {showCount ? (
            <span
              className={cn(
                "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums",
                tone === "danger" ? "bg-destructive/10 text-destructive" : isActive ? "bg-card text-primary-text" : "bg-muted text-muted-foreground",
              )}
              aria-label={tone === "danger" ? `${count} überfällig` : `${count} offen`}
            >
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

/** Benutzerbereich unten als Menue: Profil, Darstellung, Abmelden. */
function UserMenu({ onNavigate }: { onNavigate: () => void }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    onNavigate();
  }

  const name = user?.displayName || user?.email || "";

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <div role="menu" aria-label="Benutzermenü" className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link role="menuitem" to="/einstellungen" onClick={close} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted">
            <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Profil
          </Link>
          <Link role="menuitem" to="/einstellungen?bereich=darstellung" onClick={close} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted">
            <Palette className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Darstellung
          </Link>
          <div className="my-1 h-px bg-border" />
          <button
            role="menuitem"
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Abmelden
          </button>
        </div>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Benutzermenü öffnen"
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
      >
        <Avatar name={name} src={getAvatarUrl(user)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </div>
  );
}
