import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Droplets, Thermometer, TriangleAlert, Wifi } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ACCESS_LOG, TEMPERATURE_TREND_24H, activeAlerts } from "@/data/clinic";
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
const DOMAIN_MIN = 20;
const DOMAIN_MAX = 27;
const THRESHOLD = 25;

function TempTrendChart({ data }: { data: number[] }) {
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * innerH;

  const line = data
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`;
  const ticks = [20, 22, 24, 26];

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="h-56 w-full"
      role="img"
      aria-label="Temperature trend over the last 24 hours"
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

      {data.map((v, i) => (
        <g key={i}>
          <circle
            cx={x(i)}
            cy={y(v)}
            r={v > THRESHOLD - 1 ? 4.5 : 3.5}
            fill={v >= THRESHOLD ? "var(--color-destructive)" : "var(--color-primary)"}
            stroke="var(--color-card)"
            strokeWidth="2"
          >
            <title>{`${v}°C`}</title>
          </circle>
          {(i % 2 === 0 || v >= THRESHOLD) && (
            <text
              x={x(i)}
              y={CHART_H - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-muted-foreground)"
            >
              {String(i * 2).padStart(2, "0")}:00
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function DashboardPage() {
  const alerts = activeAlerts();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Thermometer className="h-4 w-4" />}
          title="Avg Temperature"
          value="22.5°C"
          sub="Room A above 25° limit"
          tone="warning"
        />
        <StatCard
          icon={<Droplets className="h-4 w-4" />}
          title="Avg Humidity"
          value="45.2%"
          sub="Within safe range (30–60%)"
          tone="success"
        />
        <StatCard
          icon={<TriangleAlert className="h-4 w-4" />}
          title="Active Alerts"
          value={String(alerts.length)}
          sub="1 Critical, 1 High"
          tone="danger"
        />
        <StatCard
          icon={<Wifi className="h-4 w-4" />}
          title="System Status"
          value="Online"
          sub="Last sync: just now"
          tone="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Temperature Trend</CardTitle>
            <CardDescription>Medicine Storage Room A &mdash; last 24 hours</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <TempTrendChart data={TEMPERATURE_TREND_24H} />
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
                {ACCESS_LOG.slice(0, 3).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-semibold tabular-nums">{log.time}</div>
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
