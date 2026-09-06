import { createFileRoute } from "@tanstack/react-router";
import { DoorClosed, DoorOpen, Thermometer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FALLBACK, getReadings, getSensors, useApiQuery, type SensorReading } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/realtime")({
  component: RealtimePage,
});

function readingBadgeVariant(status: SensorReading["status"]) {
  if (status === "Critical") return "critical" as const;
  if (status === "Warning") return "warning" as const;
  return "success" as const;
}

function readingTone(status: SensorReading["status"]) {
  if (status === "Critical") return "bg-red-500/10 text-red-600 dark:text-red-400";
  if (status === "Warning") return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-primary/10 text-primary";
}

function RealtimePage() {
  const sensors = useApiQuery(getSensors, FALLBACK.sensors, { pollMs: 15_000 });
  const readings = useApiQuery(getReadings, FALLBACK.readings, { pollMs: 10_000 });
  const live = sensors.live || readings.live;

  const readingById = new Map(readings.data.map((r) => [r.sensorId, r]));
  const climateSensors = sensors.data.filter((s) => s.type === "Temp/Humidity");
  const doorSensors = sensors.data.filter((s) => s.type !== "Temp/Humidity");

  return (
    <div className="space-y-8">
      {!live && !readings.loading && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm text-muted-foreground">
            No live telemetry — check the broker is up (<code>GET /health/ready</code>) and devices
            publish to <code>clinic/sensors/+/telemetry/climate</code>. Showing last known values.
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                sensors.refresh();
                readings.refresh();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {climateSensors.map((sensor) => {
          const reading = readingById.get(sensor.id);
          const status = reading?.status ?? "Normal";
          return (
            <Card key={sensor.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-semibold">{sensor.location}</CardTitle>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {sensor.id} &middot; {sensor.model} &middot; {sensor.status}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md",
                    readingTone(status),
                  )}
                >
                  <Thermometer className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums tracking-tight">
                    {reading?.temp ?? "--"}°
                  </span>
                  <span className="text-sm text-muted-foreground">C</span>
                  <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                    RH {reading?.humidity ?? "--"}%
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant={readingBadgeVariant(status)}>{status}</Badge>
                  {(reading?.alerts ?? 0) > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {reading?.alerts} active alert{(reading?.alerts ?? 0) > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Door Sensor Status</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {doorSensors.map((sensor) => {
            const reading = readingById.get(sensor.id);
            const isOpen = reading?.containerOpen ?? false;
            return (
              <Card key={sensor.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-semibold">{sensor.location}</CardTitle>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {sensor.id} &middot; {sensor.status}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md",
                      isOpen
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {isOpen ? <DoorOpen className="h-4 w-4" /> : <DoorClosed className="h-4 w-4" />}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        isOpen ? "bg-amber-500" : "bg-emerald-500",
                      )}
                    />
                    <span className="text-xl font-bold tracking-tight">
                      {isOpen ? "Open" : "Closed"}
                    </span>
                    <Badge
                      variant={reading ? readingBadgeVariant(reading.status) : "success"}
                      className="ml-auto"
                    >
                      {reading?.status ?? "Normal"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
