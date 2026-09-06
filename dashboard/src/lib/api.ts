import * as React from "react";
import type {
  AccessEvent,
  Alert,
  AppUser,
  Notification,
  Role,
  Sensor,
  SensorReading,
  Thresholds,
} from "./types";
import { EMPTY_THRESHOLDS } from "./types";

export type { AccessEvent, Alert, AppUser, Notification, Role, Sensor, SensorReading, Thresholds };

/* ------------------------------------------------------------------ */
/* Base URL + auth token                                                */
/* ------------------------------------------------------------------ */

export const API_BASE =
  (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env?.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

const TOKEN_KEY = "medistore-token";
const USER_KEY = "medistore-user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export interface ApiUser {
  id?: number | string;
  name?: string;
  role: Role;
  contact?: string;
}

export function getStoredUser(): ApiUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as ApiUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: ApiUser | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
}

/* ------------------------------------------------------------------ */
/* Low-level fetch                                                      */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { message?: string | string[]; error?: string };
      if (typeof body.message === "string") message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (body.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ------------------------------------------------------------------ */
/* Server shapes (tolerant: accept snake_case or camelCase)             */
/* ------------------------------------------------------------------ */

export interface DashboardSummary {
  avgTemp: number | null;
  avgHumidity: number | null;
  activeAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  systemStatus: string;
  lastSync: string | null;
  totalSensors?: number;
  onlineSensors?: number;
}

export interface TrendPoint {
  time: string;
  temp: number;
}

export interface TrendResponse {
  unit: string;
  intervalMinutes: number;
  limit: number;
  points: TrendPoint[];
  values?: number[];
}

export interface NotificationSettings {
  smsEnabled: boolean;
  buzzerEnabled: boolean;
  emailEnabled: boolean;
  recipients: string[];
}

export interface AuditEntry {
  time: string;
  timestamp?: string;
  user: string;
  action: string;
  details: string;
}

function num(v: unknown, fallback: number | null = null): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** Format an ISO-8601 timestamp for display (USAGE.md §2). */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatTimeOnly(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString("en-ZA", { hour12: false });
}

/* ------------------------------------------------------------------ */
/* Endpoint wrappers                                                    */
/* ------------------------------------------------------------------ */

export async function login(role: Role): Promise<{ token: string; user: ApiUser }> {
  const data = await apiFetch<{ token: string; user: ApiUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const raw = await apiFetch<Record<string, unknown>>("/api/dashboard/summary");
  return {
    avgTemp: num(
      raw.avgTemp ?? raw.avg_temp ?? raw.averageTemp ?? raw.avgTemperature ?? raw.avg_temperature,
    ),
    avgHumidity: num(raw.avgHumidity ?? raw.avg_humidity ?? raw.averageHumidity),
    activeAlerts: num(raw.activeAlerts ?? raw.active_alerts, 0) ?? 0,
    criticalAlerts:
      num(
        raw.criticalAlerts ?? raw.critical_alerts ?? raw.criticalCount ?? raw.critical_count,
        0,
      ) ?? 0,
    highAlerts: num(raw.highAlerts ?? raw.high_alerts ?? raw.highCount ?? raw.high_count, 0) ?? 0,
    systemStatus: str(raw.systemStatus ?? raw.system_status ?? raw.status, "Unknown"),
    lastSync: (raw.lastSync ?? raw.last_sync ?? null) as string | null,
    totalSensors: num(raw.totalSensors ?? raw.total_sensors) ?? undefined,
    onlineSensors: num(raw.onlineSensors ?? raw.online_sensors) ?? undefined,
  };
}

export async function getTemperatureTrend(
  sensorId = "SEN001",
  range: "24h" | "7d" = "24h",
): Promise<TrendResponse> {
  const raw = await apiFetch<Record<string, unknown>>(
    `/api/temperature-trend?sensorId=${encodeURIComponent(sensorId)}&range=${range}`,
  );
  const pointsRaw = (raw.points ?? raw.data ?? []) as Array<Record<string, unknown> | number>;
  const points: TrendPoint[] = pointsRaw.map((p, i) => {
    if (typeof p === "number") return { time: "", temp: p };
    return {
      time: str(p.time ?? p.recordedAt ?? p.recorded_at ?? p.label ?? `+${i}`),
      temp: num(p.temp ?? p.temperature ?? p.value, 0) ?? 0,
    };
  });
  return {
    unit: str(raw.unit, "°C"),
    intervalMinutes: num(raw.intervalMinutes ?? raw.interval_minutes, 0) ?? 0,
    limit: num(raw.limit, points.length) ?? points.length,
    points,
  };
}

function normalizeSensor(raw: Record<string, unknown>): Sensor {
  return {
    id: str(raw.id ?? raw.sensorId ?? raw.sensor_id, "SEN???"),
    type: (raw.type as Sensor["type"]) ?? "Temp/Humidity",
    location: str(raw.location, "-"),
    model: str(raw.model, "-"),
    status: (raw.status as Sensor["status"]) ?? "Active",
  };
}

export async function getSensors(type?: string, status?: string): Promise<Sensor[]> {
  const q = new URLSearchParams();
  if (type) q.set("type", type);
  if (status) q.set("status", status);
  const qs = q.toString() ? `?${q.toString()}` : "";
  const raw = await apiFetch<Record<string, unknown>[] | Record<string, unknown>>(
    `/api/sensors${qs}`,
  );
  const list = Array.isArray(raw)
    ? raw
    : ((raw.sensors ?? raw.data ?? []) as Record<string, unknown>[]);
  return (list as Record<string, unknown>[]).map(normalizeSensor);
}

export interface CreateSensorInput {
  id: string;
  type: string;
  location: string;
  model: string;
  status?: string;
  container?: string;
}

export interface UpdateSensorInput {
  location?: string;
  model?: string;
  status?: string;
  container?: string;
}

export async function createSensor(input: CreateSensorInput): Promise<Sensor> {
  const raw = await apiFetch<Record<string, unknown>>("/api/sensors", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return normalizeSensor(raw);
}

export async function updateSensor(id: string, patch: UpdateSensorInput): Promise<Sensor> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/sensors/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return normalizeSensor(raw);
}

export async function deleteSensor(id: string): Promise<void> {
  await apiFetch(`/api/sensors/${encodeURIComponent(id)}`, { method: "DELETE" });
}

function normalizeReading(raw: Record<string, unknown>): SensorReading {
  return {
    sensorId: str(raw.sensorId ?? raw.sensor_id ?? raw.id, ""),
    temp: (raw.temp as number | undefined) ?? undefined,
    humidity: (raw.humidity as number | undefined) ?? undefined,
    containerOpen: (raw.containerOpen ?? raw.container_open ?? raw.open) as boolean | undefined,
    status: (raw.status as SensorReading["status"]) ?? "Normal",
    alerts: num(raw.alerts ?? raw.alertCount ?? raw.alert_count, 0) ?? 0,
  };
}

export async function getReadings(): Promise<SensorReading[]> {
  const raw = await apiFetch<Record<string, unknown>[] | Record<string, unknown>>("/api/readings");
  const list = Array.isArray(raw) ? raw : ((raw.readings ?? raw.data ?? []) as unknown);
  return (list as Record<string, unknown>[]).map(normalizeReading);
}

function normalizeAccess(raw: Record<string, unknown>): AccessEvent {
  return {
    id: str(raw.id, cryptoRandom()),
    sensorId: str(raw.sensorId ?? raw.sensor_id ?? raw.sensor, ""),
    container: str(raw.container ?? raw.location, "-"),
    open: Boolean(raw.open ?? raw.containerOpen ?? raw.container_open ?? false),
    time: str(raw.time ?? raw.timestamp ?? raw.recordedAt ?? raw.recorded_at, "-"),
    duration: str(raw.duration ?? raw.openDuration ?? raw.open_duration, "-"),
    reason: str(raw.reason ?? raw.event ?? "-", "-"),
  };
}

function cryptoRandom(): string {
  return `EVT-${Math.floor(Math.random() * 1e6)}`;
}

export async function getAccessLog(limit = 50): Promise<AccessEvent[]> {
  const raw = await apiFetch<Record<string, unknown>[] | Record<string, unknown>>(
    `/api/access-log?limit=${limit}`,
  );
  const list = Array.isArray(raw) ? raw : ((raw.events ?? raw.data ?? raw.logs ?? []) as unknown);
  return (list as Record<string, unknown>[]).map(normalizeAccess);
}

function normalizeAlert(raw: Record<string, unknown>): Alert {
  return {
    id: str(raw.id, ""),
    sensorId: str(raw.sensorId ?? raw.sensor_id ?? raw.sensor, ""),
    type: str(raw.type ?? raw.title, "-"),
    value: str(raw.value ?? raw.val, "-"),
    time: str(raw.time ?? raw.timestamp ?? raw.createdAt ?? raw.created_at, "-"),
    severity: (raw.severity as Alert["severity"]) ?? "Medium",
    status: (raw.status as Alert["status"]) ?? "Active",
  };
}

export async function getAlerts(status?: "Active" | "All"): Promise<Alert[]> {
  const qs = status && status !== "All" ? `?status=${status}` : "";
  const raw = await apiFetch<Record<string, unknown>[] | Record<string, unknown>>(
    `/api/alerts${qs}`,
  );
  const list = Array.isArray(raw) ? raw : ((raw.alerts ?? raw.data ?? []) as unknown);
  return (list as Record<string, unknown>[]).map(normalizeAlert);
}

export async function acknowledgeAlert(id: string): Promise<void> {
  await apiFetch(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, { method: "PATCH" });
}

function normalizeNotification(raw: Record<string, unknown>): Notification {
  return {
    id: str(raw.id, cryptoRandom()),
    alertId: str(raw.alertId ?? raw.alert_id ?? raw.alert, ""),
    type: (raw.type as Notification["type"]) ?? "SMS",
    recipient: str(raw.recipient ?? raw.to, "-"),
    message: str(raw.message ?? raw.msg ?? raw.text, "-"),
  };
}

export async function getNotifications(alertId?: string): Promise<Notification[]> {
  const qs = alertId ? `?alertId=${encodeURIComponent(alertId)}` : "";
  const raw = await apiFetch<Record<string, unknown>[] | Record<string, unknown>>(
    `/api/notifications${qs}`,
  );
  const list = Array.isArray(raw) ? raw : ((raw.notifications ?? raw.data ?? []) as unknown);
  return (list as Record<string, unknown>[]).map(normalizeNotification);
}

export async function getThresholds(): Promise<Thresholds> {
  const raw = await apiFetch<Record<string, unknown>>("/api/thresholds");
  return {
    fridgeMin:
      num(raw.fridgeMin ?? raw.fridge_min, EMPTY_THRESHOLDS.fridgeMin) ??
      EMPTY_THRESHOLDS.fridgeMin,
    fridgeMax:
      num(raw.fridgeMax ?? raw.fridge_max, EMPTY_THRESHOLDS.fridgeMax) ??
      EMPTY_THRESHOLDS.fridgeMax,
    roomMax: num(raw.roomMax ?? raw.room_max, EMPTY_THRESHOLDS.roomMax) ?? EMPTY_THRESHOLDS.roomMax,
    doorOpenLimitMin:
      num(
        raw.doorOpenLimitMin ?? raw.door_open_limit_min ?? raw.doorOpenLimit,
        EMPTY_THRESHOLDS.doorOpenLimitMin,
      ) ?? EMPTY_THRESHOLDS.doorOpenLimitMin,
  };
}

export async function updateThresholds(t: Thresholds): Promise<Thresholds> {
  const raw = await apiFetch<Record<string, unknown>>("/api/thresholds", {
    method: "PUT",
    body: JSON.stringify(t),
  });
  if (!raw || Object.keys(raw).length === 0) return t;
  return {
    fridgeMin: num(raw.fridgeMin, t.fridgeMin) ?? t.fridgeMin,
    fridgeMax: num(raw.fridgeMax, t.fridgeMax) ?? t.fridgeMax,
    roomMax: num(raw.roomMax, t.roomMax) ?? t.roomMax,
    doorOpenLimitMin: num(raw.doorOpenLimitMin, t.doorOpenLimitMin) ?? t.doorOpenLimitMin,
  };
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const raw = await apiFetch<Record<string, unknown>>("/api/notification-settings");
  return {
    smsEnabled: Boolean(raw.smsEnabled ?? raw.sms_enabled ?? true),
    buzzerEnabled: Boolean(raw.buzzerEnabled ?? raw.buzzer_enabled ?? true),
    emailEnabled: Boolean(raw.emailEnabled ?? raw.email_enabled ?? false),
    recipients: (raw.recipients as string[]) ?? [],
  };
}

export async function updateNotificationSettings(
  s: NotificationSettings,
): Promise<NotificationSettings> {
  const raw = await apiFetch<Record<string, unknown>>("/api/notification-settings", {
    method: "PUT",
    body: JSON.stringify(s),
  });
  if (!raw || Object.keys(raw).length === 0) return s;
  return {
    smsEnabled: Boolean(raw.smsEnabled ?? s.smsEnabled),
    buzzerEnabled: Boolean(raw.buzzerEnabled ?? s.buzzerEnabled),
    emailEnabled: Boolean(raw.emailEnabled ?? s.emailEnabled),
    recipients: (raw.recipients as string[]) ?? s.recipients,
  };
}

function normalizeUser(raw: Record<string, unknown>): AppUser {
  return {
    id: num(raw.id, 0) ?? 0,
    name: str(raw.name, "Unknown"),
    role: (raw.role as Role) ?? "staff",
    contact: str(raw.contact ?? raw.email ?? raw.phone, "-"),
    lastLogin: str(raw.lastLogin ?? raw.last_login ?? raw.last_login_at, "Never"),
    status: (raw.status as AppUser["status"]) ?? "Active",
  };
}

export async function getUsers(): Promise<AppUser[]> {
  const raw = await apiFetch<Record<string, unknown>[] | Record<string, unknown>>("/api/users");
  const list = Array.isArray(raw) ? raw : ((raw.users ?? raw.data ?? []) as unknown);
  return (list as Record<string, unknown>[]).map(normalizeUser);
}

export async function createUser(name: string, contact?: string): Promise<AppUser> {
  const raw = await apiFetch<Record<string, unknown>>("/api/users", {
    method: "POST",
    body: JSON.stringify({ name, contact, role: "staff" }),
  });
  if (!raw || Object.keys(raw).length === 0) {
    return {
      id: 0,
      name,
      role: "staff",
      contact: contact || "-",
      lastLogin: "Never",
      status: "Active",
    };
  }
  return normalizeUser(raw);
}

export async function updateUser(
  id: number,
  patch: { name?: string; role?: Role; contact?: string; status?: AppUser["status"] },
): Promise<AppUser> {
  const raw = await apiFetch<Record<string, unknown>>(`/api/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return normalizeUser(raw);
}

export async function deleteUser(id: number): Promise<void> {
  await apiFetch(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}

function normalizeAudit(raw: Record<string, unknown>): AuditEntry {
  const time = str(raw.time ?? raw.timestamp ?? raw.createdAt ?? raw.created_at, "-");
  return {
    time,
    timestamp: time,
    user: str(raw.user ?? raw.actor ?? raw.username, "System"),
    action: str(raw.action ?? raw.event, "-"),
    details: str(raw.details ?? raw.detail ?? raw.description, "-"),
  };
}

export async function getAuditTrail(limit = 100): Promise<AuditEntry[]> {
  const raw = await apiFetch<Record<string, unknown>[] | Record<string, unknown>>(
    `/api/audit-trail?limit=${limit}`,
  );
  const list = Array.isArray(raw) ? raw : ((raw.entries ?? raw.data ?? raw.logs ?? []) as unknown);
  return (list as Record<string, unknown>[]).map(normalizeAudit);
}

export async function checkBackend(): Promise<boolean> {
  try {
    await apiFetch("/health/ready");
    return true;
  } catch {
    try {
      await apiFetch("/api/dashboard/summary");
      return true;
    } catch {
      return false;
    }
  }
}

/* ------------------------------------------------------------------ */
/* React hook: query with polling. No mock data — callers render loading,
   empty and error states from live/error/loading flags.                  */
/* ------------------------------------------------------------------ */

export interface QueryState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  live: boolean;
  refresh: () => void;
}

export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  opts?: { pollMs?: number; deps?: unknown[] },
): QueryState<T> {
  const [data, setData] = React.useState<T>(fallback);
  const [loading, setLoading] = React.useState(true);
  const [live, setLive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);
  const deps = opts?.deps ?? [];
  const pollMs = opts?.pollMs ?? 0;

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLive(true);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // No dummy data: keep the neutral initial value and flag the error.
        setData(fallback);
        setLive(false);
        setError(e instanceof Error ? e.message : "Request failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  React.useEffect(() => {
    if (!pollMs) return;
    const id = window.setInterval(() => setTick((t) => t + 1), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs]);

  return { data, loading, error, live, refresh: () => setTick((t) => t + 1) };
}
