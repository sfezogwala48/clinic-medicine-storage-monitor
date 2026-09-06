import * as React from "react";
import { Outlet, createRootRoute, useLocation } from "@tanstack/react-router";
import {
  ArrowLeft,
  ClipboardCheck,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  Pencil,
  ShieldCheck,
  Stethoscope,
  Sun,
} from "lucide-react";

import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import "../styles.css";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { MainNav, NAV_SECTIONS } from "@/components/navigation/main-nav";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RouterDialog } from "@/components/ui/router-dialog";
import { RouterSheet } from "@/components/ui/router-sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/types";
import {
  API_BASE,
  UNAUTHORIZED_EVENT,
  changePassword as apiChangePassword,
  checkBackend,
  getMe,
  getStoredUser,
  getToken,
  login as apiLogin,
  setStoredUser,
  setToken,
  updateUser,
  type ApiUser,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createRootRoute({
  component: RootComponent,
});

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

const LOGIN_ROLES: { value: Role; label: string; hint: string; icon: React.ReactNode }[] = [
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

function LoginScreen({
  onLogin,
}: {
  onLogin: (identifier: string, password: string, role: Role) => Promise<void>;
}) {
  const [role, setRole] = React.useState<Role | null>(null);
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selected = LOGIN_ROLES.find((r) => r.value === role) ?? null;
  const canSubmit = role !== null && identifier.trim() !== "" && password !== "" && !pending;

  const pickRole = (next: Role) => {
    setRole(next);
    setError(null);
  };

  const goBack = () => {
    setRole(null);
    setIdentifier("");
    setPassword("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || role === null) return;
    setPending(true);
    setError(null);
    try {
      await onLogin(identifier.trim(), password, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
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
          {selected === null ? (
            LOGIN_ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => pickRole(r.value)}
                className="group flex w-full items-center gap-3 rounded-lg border border-input bg-background px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {r.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{r.label}</span>
                  <span className="block text-xs text-muted-foreground">{r.hint}</span>
                </span>
              </button>
            ))
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {selected.label} — change user type
              </button>
              <div className="space-y-2">
                <Label htmlFor="login-identifier">Username</Label>
                <Input
                  id="login-identifier"
                  autoComplete="username"
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contact or display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-md bg-red-500/10 px-3 py-2 text-center text-xs text-red-700 dark:text-red-300"
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                className={buttonVariants({ className: "w-full" })}
                disabled={!canSubmit}
              >
                <LockKeyhole className="h-4 w-4" />
                {pending ? "Signing in…" : `Sign in as ${selected.label}`}
              </button>
            </form>
          )}
          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            Seeded demo accounts: admin@clinic.co.za, +27721111111 (supervisor), +27730000000
            (staff). Ask your admin for credentials.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileBlock({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false);
  const [stored, setStored] = React.useState<ApiUser | null>(null);
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [pwSaving, setPwSaving] = React.useState(false);
  const [pwError, setPwError] = React.useState<string | null>(null);
  const [pwDone, setPwDone] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      const s = getStoredUser();
      setStored(s);
      setName(s?.name ?? ROLE_NAMES[role]);
      setContact(s?.contact ?? "");
      setError(null);
      setCurrentPassword("");
      setNewPassword("");
      setPwError(null);
      setPwDone(false);
    }
  }, [open, role]);

  const userId = typeof stored?.id === "number" ? stored.id : Number(stored?.id ?? Number.NaN);
  const canSave = Number.isFinite(userId) && name.trim() !== "";

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateUser(userId, {
        name: name.trim(),
        contact: contact.trim() || undefined,
      });
      setStoredUser({
        ...stored,
        id: updated.id,
        name: updated.name,
        role: updated.role,
        contact: updated.contact,
      });
      setStored(getStoredUser());
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const displayName = stored?.name || ROLE_NAMES[role];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit your profile"
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
          {displayName.charAt(0)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold">{displayName}</span>
          <span className="block text-xs capitalize text-muted-foreground">{role}</span>
        </span>
        <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      <RouterDialog
        open={open}
        onOpenChange={setOpen}
        trigger={<span className="hidden" />}
        title="Your Profile"
        description={`Signed in as ${role}. Name and contact sync to the server.`}
      >
        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!Number.isFinite(userId) && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Session expired — please sign in again.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="profile-name">Display name</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-contact">Contact</Label>
            <Input
              id="profile-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Phone or email"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <p className="rounded-md border border-input bg-muted px-3 py-2 text-sm capitalize text-muted-foreground">
              {role} (managed by an admin)
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || !canSave}>
              {saving ? "Saving…" : "Save Profile"}
            </Button>
          </div>
          <div className="space-y-2 border-t pt-4">
            <Label>Change password</Label>
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            {pwDone && <p className="text-sm text-emerald-600">Password changed.</p>}
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
            />
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                disabled={pwSaving || currentPassword === "" || newPassword.length < 8}
                onClick={async () => {
                  setPwSaving(true);
                  setPwError(null);
                  setPwDone(false);
                  try {
                    await apiChangePassword(currentPassword, newPassword);
                    setCurrentPassword("");
                    setNewPassword("");
                    setPwDone(true);
                  } catch (e) {
                    setPwError(e instanceof Error ? e.message : "Password change failed");
                  } finally {
                    setPwSaving(false);
                  }
                }}
              >
                {pwSaving ? "Changing…" : "Change Password"}
              </Button>
            </div>
          </div>
        </div>
      </RouterDialog>
    </>
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
          <ProfileBlock role={role} />
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
                  ? `Backend unreachable at ${API_BASE} — sign-in and live data unavailable`
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
              {backendUp === null ? "Checking…" : backendUp ? "Live" : "Offline"}
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
  const [user, setUser] = React.useState<ApiUser | null>(() => getStoredUser());
  const [validating, setValidating] = React.useState(() => getToken() !== null);
  const role: Role | null = user?.role ?? null;

  const handleLogin = async (identifier: string, password: string, role: Role) => {
    const { user: loggedIn } = await apiLogin(identifier, password, role);
    setUser(loggedIn);
  };

  const handleLogout = React.useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
  }, []);

  // Validate any persisted session against the server on boot.
  React.useEffect(() => {
    if (!getToken()) {
      setValidating(false);
      return;
    }
    getMe()
      .then((me) => setUser(me))
      .catch(() => handleLogout())
      .finally(() => setValidating(false));
  }, [handleLogout]);

  // The API layer clears the token on 401 — drop back to the login screen.
  React.useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  return (
    <ThemeProvider>
      {validating ? (
        <div className="flex min-h-svh items-center justify-center bg-muted/60">
          <p className="text-sm text-muted-foreground">Restoring session…</p>
        </div>
      ) : role ? (
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
