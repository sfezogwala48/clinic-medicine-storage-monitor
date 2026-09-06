import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BellRing, CheckCircle2, MessageSquareText, Siren } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RouterDialog } from "@/components/ui/router-dialog";
import {
  FALLBACK,
  acknowledgeAlert,
  formatTime,
  getAlerts,
  getNotifications,
  useApiQuery,
  type Alert,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({ component: AlertsPage });

function severityVariant(severity: Alert["severity"]) {
  if (severity === "Critical") return "critical" as const;
  if (severity === "High") return "warning" as const;
  return "secondary" as const;
}

type StatusFilter = "Active" | "All";

function AlertsPage() {
  const [filter, setFilter] = React.useState<StatusFilter>("Active");
  const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined);
  const [ackError, setAckError] = React.useState<string | null>(null);
  const [ackedIds, setAckedIds] = React.useState<Set<string>>(new Set());

  const alerts = useApiQuery(() => getAlerts(filter), FALLBACK.alerts, {
    deps: [filter],
    pollMs: 15_000,
  });
  const notifications = useApiQuery(() => getNotifications(selectedId), FALLBACK.notifications, {
    deps: [selectedId],
    pollMs: 20_000,
  });

  const visible = alerts.data.map((a) =>
    ackedIds.has(a.id) ? { ...a, status: "Resolved" as const } : a,
  );
  const critical = visible.filter((a) => a.severity === "Critical").length;
  const highMedium = visible.filter((a) => a.severity !== "Critical").length;
  const resolved = visible.filter((a) => a.status === "Resolved").length;

  const doAcknowledge = async (id: string) => {
    setAckError(null);
    // Optimistic update; PATCH silences buzzers at that location (USAGE.md §1).
    setAckedIds((prev) => new Set(prev).add(id));
    try {
      await acknowledgeAlert(id);
      alerts.refresh();
    } catch (e) {
      setAckedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setAckError(e instanceof Error ? e.message : "Acknowledge failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded-md border border-input text-sm">
          {(["Active", "All"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1.5",
                filter === s ? "bg-primary text-primary-foreground" : "bg-background",
              )}
            >
              {s === "All" ? "All alerts" : "Active only"}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {alerts.live ? "Live from server" : "Cached data — backend unreachable"} · acknowledging
          an alert resolves it and silences buzzers at that location.
        </p>
      </div>

      {ackError && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="py-3 text-sm">Acknowledge failed: {ackError}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical</CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
              <Siren className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="text-2xl font-bold tracking-tight">{critical}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High / Medium
            </CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BellRing className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="text-2xl font-bold tracking-tight">{highMedium}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="text-2xl font-bold tracking-tight">{resolved}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden lg:table-cell">Sensor</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((alert) => (
                <TableRow
                  key={alert.id}
                  className={cn(selectedId === alert.id && "bg-accent/50")}
                  onClick={() => setSelectedId(alert.id)}
                >
                  <TableCell className="whitespace-nowrap font-mono">{alert.id}</TableCell>
                  <TableCell>{alert.type}</TableCell>
                  <TableCell className="hidden whitespace-nowrap lg:table-cell">
                    {alert.sensorId}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-semibold">{alert.value}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatTime(alert.time)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={alert.status === "Active" ? "success" : "secondary"}>
                      {alert.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {alert.status === "Active" ? (
                      <RouterDialog
                        trigger={
                          <Button size="sm" variant="outline">
                            Acknowledge
                          </Button>
                        }
                        title={`Acknowledge ${alert.id}`}
                        description={`${alert.type} on ${alert.sensorId} at ${formatTime(alert.time)}`}
                      >
                        <p className="text-sm text-muted-foreground">
                          Confirming marks this alert Resolved and silences buzzers at that location
                          (<code>PATCH /api/alerts/:id/acknowledge</code>).
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                          <Button size="sm" onClick={() => doAcknowledge(alert.id)}>
                            Confirm Acknowledge
                          </Button>
                        </div>
                      </RouterDialog>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <BellRing className="h-5 w-5" /> Notification Log
          {selectedId && (
            <Button size="sm" variant="ghost" onClick={() => setSelectedId(undefined)}>
              Clear filter ({selectedId})
            </Button>
          )}
        </h2>
        <p className="mb-2 text-sm text-muted-foreground">
          SMS + buzzer dispatch log — click an alert row to filter by <code>?alertId=…</code>.
        </p>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Alert</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.data.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono">{n.id}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                        {n.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">{n.alertId}</TableCell>
                    <TableCell>{n.recipient}</TableCell>
                    <TableCell>{n.message}</TableCell>
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
