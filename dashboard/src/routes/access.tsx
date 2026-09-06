import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FALLBACK, formatTime, getAccessLog, useApiQuery } from "@/lib/api";

export const Route = createFileRoute("/access")({ component: AccessPage });

const LIMITS = [10, 25, 50, 100, 200];

function AccessPage() {
  const [limit, setLimit] = React.useState(50);
  const log = useApiQuery(() => getAccessLog(limit), FALLBACK.access, {
    deps: [limit],
    pollMs: 15_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Newest first · durations pre-formatted by the server (<code>"5m"</code>, <code>"-"</code>{" "}
          for close events).
          {!log.live && !log.loading && " Showing cached data — backend unreachable."}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="access-limit" className="text-sm text-muted-foreground">
            Limit
          </label>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger id="access-limit" className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMITS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={log.refresh}>
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Container</TableHead>
                <TableHead>Sensor ID</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.loading && log.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading access log…
                  </TableCell>
                </TableRow>
              ) : (
                log.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatTime(entry.time)}
                    </TableCell>
                    <TableCell className="font-semibold">{entry.container}</TableCell>
                    <TableCell className="font-mono">{entry.sensorId}</TableCell>
                    <TableCell className="tabular-nums">{entry.duration}</TableCell>
                    <TableCell>{entry.reason}</TableCell>
                    <TableCell>
                      <Badge variant={entry.open ? "warning" : "secondary"}>
                        {entry.open ? "Open" : "Closed"}
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
  );
}
