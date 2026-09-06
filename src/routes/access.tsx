import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACCESS_LOG } from "@/data/clinic";

export const Route = createFileRoute("/access")({ component: AccessPage });

function AccessPage() {
  return (
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
            {ACCESS_LOG.map((log) => (
              <TableRow key={log.id}>
                <TableCell>2026-06-02 {log.time}</TableCell>
                <TableCell className="font-semibold">{log.container}</TableCell>
                <TableCell>{log.sensorId}</TableCell>
                <TableCell>{log.duration}</TableCell>
                <TableCell>{log.reason}</TableCell>
                <TableCell>
                  <Badge variant={log.open ? "warning" : "secondary"}>
                    {log.open ? "Open" : "Closed"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
