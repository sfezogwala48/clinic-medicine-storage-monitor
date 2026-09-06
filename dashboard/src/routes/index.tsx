import * as React from "react";
import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Droplets, Thermometer, TriangleAlert, Wifi } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  formatTime,
  formatTimeOnly,
  getAccessLog,
  getDashboardSummary,
  getTemperatureTrend,
  useApiQuery,
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

const THRESHOLD = 25;

const trendChartConfig = {
  temp: {
    label: "Temperature",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface TrendDatum {
  label: string;
  temp: number;
}

function TempTrendChart({ data }: { data: TrendDatum[] }) {
  return (
    <ChartContainer config={trendChartConfig} className="min-h-[220px] w-full">
      <AreaChart accessibilityLayer data={data} margin={{ left: 0, right: 8 }}>
        <defs>
          <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-temp)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-temp)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: "var(--color-border)" }}
          tickMargin={8}
          minTickGap={32}
        />
        <YAxis
          width={40}
          tickLine={false}
          axisLine={{ stroke: "var(--color-border)" }}
          tickFormatter={(v: number) => `${v}°`}
          domain={[
            (dataMin: number) => Math.floor(dataMin - 1),
            (dataMax: number) => Math.ceil(dataMax + 1),
          ]}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value) => {
                const num = typeof value === "number" ? value : Number(value);
                return Number.isFinite(num) ? `${num}°C` : "";
              }}
            />
          }
        />
        <ReferenceLine
          y={THRESHOLD}
          stroke="var(--color-destructive)"
          strokeDasharray="6 4"
          label={{
            value: `Limit ${THRESHOLD}°`,
            position: "insideTopRight",
            fill: "var(--color-destructive)",
            fontSize: 11,
            fontWeight: 600,
          }}
        />
        <Area
          dataKey="temp"
          type="monotone"
          stroke="var(--color-temp)"
          strokeWidth={2.5}
          fill="url(#tempFill)"
          dot={{ r: 3, strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

const TREND_SENSORS = ["SEN001", "SEN002", "SEN003"];

function DashboardPage() {
  const [trendSensor, setTrendSensor] = React.useState("SEN001");
  const [trendRange, setTrendRange] = React.useState<"24h" | "7d">("24h");

  const summary = useApiQuery(
    getDashboardSummary,
    {
      avgTemp: null,
      avgHumidity: null,
      activeAlerts: 0,
      criticalAlerts: 0,
      highAlerts: 0,
      systemStatus: "Offline",
      lastSync: null,
    },
    { pollMs: 15_000 },
  );
  const trend = useApiQuery(
    () => getTemperatureTrend(trendSensor, trendRange),
    { unit: "°C", intervalMinutes: 0, limit: 0, points: [] },
    { deps: [trendSensor, trendRange], pollMs: 30_000 },
  );
  const access = useApiQuery(() => getAccessLog(3), [], { pollMs: 15_000 });

  const s = summary.data;
  const chartData: TrendDatum[] = (trend.live ? trend.data.points : []).map((p) => ({
    label: p.time ? formatTimeOnly(p.time).slice(0, 5) : "",
    temp: p.temp,
  }));
  const online =
    s.systemStatus.toLowerCase().includes("on") ||
    s.systemStatus.toLowerCase().includes("ok") ||
    s.systemStatus === "Online";

  return (
    <div className="space-y-6">
      {!summary.live && !summary.loading && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-3 text-sm text-muted-foreground">
            Backend unreachable ({summary.error ?? "connection failed"}) — no data to display. Start
            the server + MQTT broker and publish telemetry to populate live readings.{" "}
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
          sub={`Last sync: ${s.lastSync ? formatTime(s.lastSync) : "—"}${summary.live ? "" : " (offline)"}`}
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
                <Select value={trendSensor} onValueChange={setTrendSensor}>
                  <SelectTrigger aria-label="Trend sensor" className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TREND_SENSORS.map((id) => (
                      <SelectItem key={id} value={id}>
                        {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            {trend.loading ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Loading trend…</p>
            ) : chartData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No trend data yet — publish telemetry for {trendSensor} to populate this chart.
              </p>
            ) : (
              <TempTrendChart data={chartData} />
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
                {access.loading ? (
                  <TableRow>
                    <TableCell className="py-6 text-center text-sm text-muted-foreground">
                      Loading access events…
                    </TableCell>
                  </TableRow>
                ) : access.data.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-6 text-center text-sm text-muted-foreground">
                      No access events yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  access.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="font-semibold tabular-nums">{formatTime(log.time)}</div>
                        <div className="text-xs text-muted-foreground">{log.container}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={log.reason.includes("Unauthorized") ? "critical" : "success"}
                        >
                          {log.reason}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
