import { createFileRoute } from "@tanstack/react-router";
import { Activity, CalendarDays, Download, FileText, PiggyBank, ShieldCheck } from "lucide-react";

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
import { getReports, getReportsSummary, reportDownloadUrl, useApiQuery } from "@/lib/api";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

function ReportsPage() {
  const summary = useApiQuery(
    getReportsSummary,
    { complianceScore: 0, accessTotal: 0, wastePrevented: "-" },
    { pollMs: 60_000 },
  );
  const files = useApiQuery(getReports, [], { pollMs: 60_000 });
  const s = summary.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button>
          <FileText className="h-4 w-4" /> Daily Report
        </Button>
        <Button variant="outline">
          <CalendarDays className="h-4 w-4" /> Weekly Summary
        </Button>
        <Button variant="outline">
          <CalendarDays className="h-4 w-4" /> Monthly Compliance
        </Button>
        {!summary.live && !summary.loading && (
          <span className="ml-auto self-center text-xs text-muted-foreground">
            Backend unreachable.
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Compliance Score
            </CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {s.complianceScore}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Target: ≥95% (GET /api/reports/summary)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Access Events
            </CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{s.accessTotal}</div>
            <p className="mt-1 text-xs text-muted-foreground">Access total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Est. Waste Prevented
            </CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <PiggyBank className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{s.wastePrevented}</div>
            <p className="mt-1 text-xs text-muted-foreground">Based on temp excursions caught</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generated Reports Archive</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Loading reports…
                  </TableCell>
                </TableRow>
              ) : files.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No reports generated yet.
                  </TableCell>
                </TableRow>
              ) : (
                files.data.map((report) => (
                  <TableRow key={report.name}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-500" />
                        {report.name}
                      </span>
                    </TableCell>
                    <TableCell>{report.size}</TableCell>
                    <TableCell className="text-right">
                      <a href={reportDownloadUrl(report)} download={report.name}>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" /> Download
                        </Button>
                      </a>
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
