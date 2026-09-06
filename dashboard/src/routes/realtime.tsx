import { createFileRoute } from "@tanstack/react-router";
import { DoorClosed, DoorOpen, Thermometer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SENSORS, readingFor, type SensorReading } from "@/data/clinic";
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
  const climateSensors = SENSORS.filter((s) => s.type === "Temp/Humidity");
  const doorSensors = SENSORS.filter((s) => s.type === "Magnetic Door");

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {climateSensors.map((sensor) => {
          const reading = readingFor(sensor.id);
          const status = reading?.status ?? "Normal";
          return (
            <Card key={sensor.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-semibold">{sensor.location}</CardTitle>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {sensor.id} &middot; {sensor.model}
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
                <div className="mt-3">
                  <Badge variant={readingBadgeVariant(status)}>{status}</Badge>
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
            const reading = readingFor(sensor.id);
            const isOpen = reading?.containerOpen ?? false;
            return (
              <Card key={sensor.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-semibold">{sensor.location}</CardTitle>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{sensor.id}</p>
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
