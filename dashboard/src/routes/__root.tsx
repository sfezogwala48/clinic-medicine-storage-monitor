import * as React from "react";
import { Outlet, createRootRoute, useLocation } from "@tanstack/react-router";
import {
  ClipboardCheck,
  HeartPulse,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Stethoscope,
  Sun,
} from "lucide-react";

import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import "../styles.css";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { MainNav, NAV_SECTIONS } from "@/components/navigation/main-nav";
import { Button } from "@/components/ui/button";
import { RouterSheet } from "@/components/ui/router-sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/types";
import {
  API_BASE,
  checkBackend,
  getToken,
  login as apiLogin,
  setStoredUser,
  setToken,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createRootRoute({
  component: RootComponent,
});

const ROLE_STORAGE_KEY = "medistore-role";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard Overview",
  "/realtime": "Real-Time Sensor Monitoring",
  "/access": "Container Access Log",
  "/alerts": "Alerts & Notifications",
  "/settings": "System Configuration",
  "/users": "User Management",
};

const ROLE_NAMES: Record<Role, string> = {
  admin: "Dr. Ajibola",
  supervisor: "Nurse Dlamini",
  staff: "Pharmacist Mokoena",
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <HeartPulse className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-bold tracking-tight">MediStore</span>
          <span className="block text-[11px] font-medium text-muted-foreground">
            Storage Monitor
          </span>
        </span>
      )}
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80">
            {section.title}
          </p>
          <MainNav items={section.items} orientation="vertical" onNavigate={onNavigate} />
        </div>
      ))}
    </nav>
  );
}

function LoginScreen({ onLogin }: { onLogin: (role: Role) => Promise<void> }) {
  const roles: { value: Role; label: string; hint: string; icon: React.ReactNode }[] = [
    {
      value: "admin",
      label: "Admin",
      hint: "Full access to all modules",
      icon: <ShieldCheck className="h-5 w-5" />,
    },
    {
      value: "supervisor",
      label: "Supervisor",
      hint: "Alerts & oversight",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      value: "staff",
      label: "Staff",
      hint: "Daily operations",
      icon: <Stethoscope className="h-5 w-5" />,
    },
  ];

  const [pending, setPending] = React.useState<Role | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async (role: Role) => {
    setPending(role);
    setError(null);
    try {
      await onLogin(role);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-muted/60 p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--color-primary)/15%,transparent)]"
      />
      <Card className="relative w-full max-w-sm shadow-lg">
        <CardHeader className="items-center pb-2 text-center">
          <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <HeartPulse className="h-6 w-6" />
          </span>
          <CardTitle className="text-xl tracking-tight">MediStore Monitor</CardTitle>
          <CardDescription>Dr Ajibola&apos;s Clinic &mdash; sign in to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {roles.map((role) => (
            <button
              key={role.value}
              type="button"
              disabled={pending !== null}
              onClick={() => handleClick(role.value)}
              className="group flex w-full items-center gap-3 rounded-lg border border-input bg-background px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {role.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  {role.label}
                  {pending === role.value ? " — signing in…" : ""}
                </span>
                <span className="block text-xs text-muted-foreground">{role.hint}</span>
              </span>
            </button>
          ))}
          {error && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-700 dark:text-amber-300">
              Server login failed ({error}) — continuing with demo role.
            </p>
          )}
          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            POST /api/auth/login with {'{"role": "..."}'} returns a demo token; the server also
            accepts requests without enforcing it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AppShell({ role, onLogout }: { role: Role; onLogout: () => void }) {
  const pathname = useLocation({ select: (s) => s.pathname });
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [backendUp, setBackendUp] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    checkBackend().then((up) => {
      if (!cancelled) setBackendUp(up);
    });
    const id = window.setInterval(() => {
      checkBackend().then((up) => {
        if (!cancelled) setBackendUp(up);
      });
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
  const today = React.useMemo(
    () =>
      new Date().toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  return (
    <div id="root-content" className="flex min-h-svh">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>
        <SidebarNav />
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
              {ROLE_NAMES[role].charAt(0)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold">{ROLE_NAMES[role]}</span>
              <span className="block text-xs capitalize text-muted-foreground">{role}</span>
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <RouterSheet
              open={mobileNavOpen}
              onOpenChange={setMobileNavOpen}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              }
              title="MediStore"
              description="Clinic medicine storage monitoring"
            >
              <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
            </RouterSheet>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-bold tracking-tight sm:text-lg">
                {PAGE_TITLES[pathname] ?? "Dashboard"}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <span
              title={
                backendUp === false
                  ? `Backend unreachable at ${API_BASE} — showing cached demo data`
                  : `Backend: ${API_BASE}`
              }
              className="hidden items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium md:inline-flex"
            >
              <span className="relative flex h-2 w-2">
                {backendUp !== false && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                )}
                <span
                  className={cn(
                    "relative inline-flex h-2 w-2 rounded-full",
                    backendUp === false ? "bg-amber-500" : "bg-emerald-500",
                  )}
                />
              </span>
              {backendUp === null ? "Checking…" : backendUp ? "Live" : "Demo cache"}
            </span>
            <span className="hidden text-sm text-muted-foreground lg:inline">{today}</span>
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="Log out" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className={cn("flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6 lg:p-8")}>
          <div className="mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Portal root for overlays */}
      <div id="portal-root"></div>
    </div>
  );
}

function RootComponent() {
  const [role, setRole] = React.useState<Role | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem(ROLE_STORAGE_KEY);
    return saved === "admin" || saved === "supervisor" || saved === "staff" ? saved : null;
  });

  const handleLogin = async (next: Role) => {
    window.localStorage.setItem(ROLE_STORAGE_KEY, next);
    try {
      // USAGE.md: POST /api/auth/login {role} → {token, user}; server also
      // accepts unauthenticated requests, so fall back to demo mode offline.
      await apiLogin(next);
    } catch {
      setToken(`demo-${next}-local`);
      setStoredUser({ role: next });
    }
    setRole(next);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(ROLE_STORAGE_KEY);
    setToken(null);
    setStoredUser(null);
    setRole(null);
  };

  // Keep demo sessions working across restarts even without a stored role.
  React.useEffect(() => {
    if (!role && getToken()) {
      const saved = window.localStorage.getItem(ROLE_STORAGE_KEY);
      if (saved === "admin" || saved === "supervisor" || saved === "staff") setRole(saved);
    }
  }, [role]);

  return (
    <ThemeProvider>
      {role ? (
        <AppShell role={role} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </ThemeProvider>
  );
}
