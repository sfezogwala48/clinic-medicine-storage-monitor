import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

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
import { formatTime, getAccessLog, useApiQuery } from "@/lib/api";

export const Route = createFileRoute("/access")({ component: AccessPage });

const LIMITS = [10, 25, 50, 100, 200];
const PAGE_SIZE = 10;

function AccessPage() {
  const [limit, setLimit] = React.useState(50);
  const [page, setPage] = React.useState(0);
  const log = useApiQuery(() => getAccessLog(limit), [], {
    deps: [limit],
    pollMs: 15_000,
  });
  const entries = log.data.filter((entry) => entry.open);
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

  React.useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  const visible = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!log.live && !log.loading && (
          <p className="text-sm text-muted-foreground">Backend unreachable.</p>
        )}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading access log…
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No access events yet.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatTime(entry.time)}
                    </TableCell>
                    <TableCell className="font-semibold">{entry.container}</TableCell>
                    <TableCell className="font-mono">{entry.sensorId}</TableCell>
                    <TableCell className="tabular-nums">{entry.duration}</TableCell>
                    <TableCell>{entry.reason}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {entries.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, entries.length)} of{" "}
            {entries.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
