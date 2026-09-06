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

export const Route = createFileRoute("/reports")({ component: ReportsPage });

function ReportsPage() {
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
              98%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Target: ≥95%</p>
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
            <div className="text-2xl font-bold tracking-tight">42</div>
            <p className="mt-1 text-xs text-muted-foreground">Last 24 Hours</p>
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
            <div className="text-2xl font-bold tracking-tight">R 12,500</div>
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
              {[
                { name: "Daily_Report_2026-06-01.pdf", size: "2.4 MB" },
                { name: "Weekly_Compliance_Wk22.pdf", size: "5.1 MB" },
              ].map((report) => (
                <TableRow key={report.name}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-500" />
                      {report.name}
                    </span>
                  </TableCell>
                  <TableCell>{report.size}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
