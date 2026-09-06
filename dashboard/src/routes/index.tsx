import * as React from "react";
import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Droplets, Thermometer, TriangleAlert, Wifi } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  FALLBACK,
  formatTime,
  getAccessLog,
  getDashboardSummary,
  getTemperatureTrend,
  useApiQuery,
  type TrendResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: DashboardPage });

function StatCard({
  icon,
  title,
  value,
  sub,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  sub: string;
  tone: "primary" | "success" | "danger" | "warning";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md",
            tone === "primary" && "bg-primary/10 text-primary",
            tone === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            tone === "danger" && "bg-red-500/10 text-red-600 dark:text-red-400",
            tone === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          )}
        >
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              tone === "primary" && "bg-primary",
              tone === "success" && "bg-emerald-500",
              tone === "danger" && "bg-red-500",
              tone === "warning" && "bg-amber-500",
            )}
          />
          {sub}
        </p>
      </CardContent>
    </Card>
  );
}

const CHART_W = 600;
const CHART_H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };
const THRESHOLD = 25;

function TempTrendChart({ trend, fallback }: { trend: TrendResponse | null; fallback: number[] }) {
  const values = trend && trend.points.length > 0 ? trend.points.map((p) => p.temp) : fallback;
  const min = Math.min(...values, THRESHOLD - 2);
  const max = Math.max(...values, THRESHOLD + 2);
  const span = Math.max(max - min, 1);
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / Math.max(values.length - 1, 1)) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - min) / span) * innerH;

  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`;
  const ticks = [min, (min + max) / 2, max].map((t) => Math.round(t * 10) / 10);

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="h-56 w-full"
      role="img"
      aria-label="Temperature trend"
    >
      <defs>
        <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={CHART_W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--color-border)"
            strokeDasharray="3 4"
          />
          <text
            x={PAD.left - 8}
            y={y(t) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--color-muted-foreground)"
          >
            {t}°
          </text>
        </g>
      ))}

      <line
        x1={PAD.left}
        x2={CHART_W - PAD.right}
        y1={y(THRESHOLD)}
        y2={y(THRESHOLD)}
        stroke="var(--color-destructive)"
        strokeDasharray="6 4"
        strokeWidth="1.5"
      />
      <text
        x={CHART_W - PAD.right}
        y={y(THRESHOLD) - 6}
        textAnchor="end"
        fontSize="11"
        fontWeight="600"
        fill="var(--color-destructive)"
      >
        Limit {THRESHOLD}°
      </text>

      <path d={area} fill="url(#tempFill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {values.map((v, i) => (
        <g key={i}>
          <circle
            cx={x(i)}
            cy={y(v)}
            r={v >= THRESHOLD ? 4.5 : 3.5}
            fill={v >= THRESHOLD ? "var(--color-destructive)" : "var(--color-primary)"}
            stroke="var(--color-card)"
            strokeWidth="2"
          >
            <title>{`${v}°C${trend?.points[i]?.time ? ` @ ${trend.points[i].time}` : ""}`}</title>
          </circle>
          {(i % 2 === 0 || v >= THRESHOLD) && (
            <text
              x={x(i)}
              y={CHART_H - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-muted-foreground)"
            >
              {trend?.points[i]?.time
                ? formatTime(trend.points[i].time).slice(-8, -3) || trend.points[i].time
                : `${String(i * 2).padStart(2, "0")}:00`}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

const TREND_SENSORS = ["SEN001", "SEN002", "SEN003"];

function DashboardPage() {
  const [trendSensor, setTrendSensor] = React.useState("SEN001");
  const [trendRange, setTrendRange] = React.useState<"24h" | "7d">("24h");

  const summary = useApiQuery(
    getDashboardSummary,
    {
      avgTemp: 22.5,
      avgHumidity: 45.2,
      activeAlerts: 2,
      criticalAlerts: 1,
      highAlerts: 1,
      systemStatus: "Online",
      lastSync: "just now",
    },
    { pollMs: 15_000 },
  );
  const trend = useApiQuery(
    () => getTemperatureTrend(trendSensor, trendRange),
    {
      unit: "°C",
      intervalMinutes: 120,
      limit: 12,
      points: FALLBACK.trendValues.map((temp) => ({ time: "", temp })),
    },
    { deps: [trendSensor, trendRange], pollMs: 30_000 },
  );
  const access = useApiQuery(() => getAccessLog(3), FALLBACK.access.slice(0, 3), {
    pollMs: 15_000,
  });

  const s = summary.data;
  const online =
    s.systemStatus.toLowerCase().includes("on") ||
    s.systemStatus.toLowerCase().includes("ok") ||
    s.systemStatus === "Online";

  return (
    <div className="space-y-6">
      {!summary.live && !summary.loading && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-3 text-sm text-muted-foreground">
            Backend unreachable ({summary.error ?? "connection failed"}) — showing seeded demo data.
            Start the server + MQTT broker per <code>reference/USAGE.md</code> §4 and publish
            telemetry to populate live readings.{" "}
            <Button size="sm" variant="outline" className="ml-2" onClick={summary.refresh}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Thermometer className="h-4 w-4" />}
          title="Avg Temperature"
          value={s.avgTemp == null ? "--" : `${s.avgTemp.toFixed(1)}°C`}
          sub={s.avgTemp != null && s.avgTemp > 25 ? "Above 25° room limit" : "Within safe range"}
          tone={s.avgTemp != null && s.avgTemp > 25 ? "warning" : "success"}
        />
        <StatCard
          icon={<Droplets className="h-4 w-4" />}
          title="Avg Humidity"
          value={s.avgHumidity == null ? "--" : `${s.avgHumidity.toFixed(1)}%`}
          sub="Safe range 30–60%"
          tone="success"
        />
        <StatCard
          icon={<TriangleAlert className="h-4 w-4" />}
          title="Active Alerts"
          value={String(s.activeAlerts)}
          sub={`${s.criticalAlerts} Critical, ${s.highAlerts} High`}
          tone={s.activeAlerts > 0 ? "danger" : "success"}
        />
        <StatCard
          icon={<Wifi className="h-4 w-4" />}
          title="System Status"
          value={s.systemStatus}
          sub={`Last sync: ${s.lastSync ? formatTime(s.lastSync) : "just now"}${summary.live ? "" : " (cached)"}`}
          tone={online ? "primary" : "danger"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Temperature Trend</CardTitle>
                <CardDescription>
                  {trendSensor} — last {trendRange} ({trend.data.unit}, every{" "}
                  {trend.data.intervalMinutes || "--"} min)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <select
                  aria-label="Trend sensor"
                  value={trendSensor}
                  onChange={(e) => setTrendSensor(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  {TREND_SENSORS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <div className="flex overflow-hidden rounded-md border border-input text-sm">
                  {(["24h", "7d"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTrendRange(r)}
                      className={cn(
                        "px-2.5 py-1",
                        trendRange === r ? "bg-primary text-primary-foreground" : "bg-background",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {trend.loading && trend.data.points.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Loading trend…</p>
            ) : (
              <TempTrendChart
                trend={trend.live ? trend.data : null}
                fallback={FALLBACK.trendValues}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Access Events</CardTitle>
            <CardDescription>Latest container activity</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <Table>
              <TableBody>
                {access.data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-semibold tabular-nums">{formatTime(log.time)}</div>
                      <div className="text-xs text-muted-foreground">{log.container}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={log.reason.includes("Unauthorized") ? "critical" : "success"}>
                        {log.reason}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
