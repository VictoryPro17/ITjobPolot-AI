import { Suspense, useState } from "react";
import { Menu } from "lucide-react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { getAvatarUrl } from "@/features/auth/api";

export function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-full">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Navigation öffnen"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Avatar name={user?.displayName || user?.email || ""} src={getAvatarUrl(user)} className="hidden sm:flex lg:hidden" />
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Platzhalter, waehrend eine Seite nachgeladen wird; Navigation und Kopfzeile bleiben stehen. */
function PageFallback() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Seite wird geladen">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64" />
    </div>
  );
}
