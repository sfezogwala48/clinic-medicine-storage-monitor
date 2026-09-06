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
import { ALERTS, NOTIFICATIONS, type Alert } from "@/data/clinic";

export const Route = createFileRoute("/alerts")({ component: AlertsPage });

function severityVariant(severity: Alert["severity"]) {
  if (severity === "Critical") return "critical" as const;
  if (severity === "High") return "warning" as const;
  return "secondary" as const;
}

function AlertsPage() {
  const [alerts, setAlerts] = React.useState(ALERTS);

  const critical = alerts.filter((a) => a.severity === "Critical").length;
  const highMedium = alerts.filter((a) => a.severity !== "Critical").length;
  const resolved = alerts.filter((a) => a.status === "Resolved").length;

  const acknowledge = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Resolved" } : a)));
  };

  return (
    <div className="space-y-6">
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved Today
            </CardTitle>
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
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="whitespace-nowrap">{alert.id}</TableCell>
                  <TableCell>{alert.type}</TableCell>
                  <TableCell className="hidden whitespace-nowrap lg:table-cell">
                    {alert.sensorId}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-semibold">{alert.value}</TableCell>
                  <TableCell className="whitespace-nowrap">{alert.time}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={alert.status === "Active" ? "success" : "secondary"}>
                      {alert.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {alert.status === "Active" ? (
                      <RouterDialog
                        trigger={
                          <Button size="sm" variant="outline">
                            Acknowledge
                          </Button>
                        }
                        title={`Acknowledge ${alert.id}`}
                        description={`${alert.type} on ${alert.sensorId} at ${alert.time}`}
                      >
                        <p className="text-sm text-muted-foreground">
                          Confirming will mark this alert as resolved and stop further
                          notifications.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                          <Button size="sm" onClick={() => acknowledge(alert.id)}>
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
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {NOTIFICATIONS.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>{n.id}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                        {n.type}
                      </span>
                    </TableCell>
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
