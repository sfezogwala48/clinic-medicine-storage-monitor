import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DoorClosed, DoorOpen, Pencil, Plus, Thermometer, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RouterDialog } from "@/components/ui/router-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createSensor,
  deleteSensor,
  getReadings,
  getSensors,
  updateSensor,
  useApiQuery,
  type Sensor,
  type SensorReading,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/realtime")({
  component: RealtimePage,
});

type SensorTypeOption = "Temp/Humidity" | "Magnetic Door";
type SensorStatusOption = "Active" | "Inactive";

function SensorDialog({
  mode,
  sensor,
  open,
  onOpenChange,
  onSaved,
  onDelete,
}: {
  mode: "register" | "edit";
  sensor?: Sensor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDelete?: () => void;
}) {
  const [id, setId] = React.useState("");
  const [type, setType] = React.useState<SensorTypeOption>("Temp/Humidity");
  const [location, setLocation] = React.useState("");
  const [model, setModel] = React.useState("");
  const [status, setStatus] = React.useState<SensorStatusOption>("Active");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setId("");
      setType("Temp/Humidity");
      setLocation(sensor?.location ?? "");
      setModel(sensor?.model ?? "");
      setStatus(sensor?.status === "Inactive" ? "Inactive" : "Active");
      setError(null);
    }
  }, [open, sensor]);

  const valid =
    location.trim() !== "" && model.trim() !== "" && (mode === "edit" || id.trim() !== "");

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      if (mode === "register") {
        await createSensor({
          id: id.trim(),
          type,
          location: location.trim(),
          model: model.trim(),
          status,
        });
      } else if (sensor) {
        await updateSensor(sensor.id, {
          location: location.trim(),
          model: model.trim(),
          status,
        });
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RouterDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={<span className="hidden" />}
      title={mode === "register" ? "Register Sensor" : `Edit ${sensor?.id}`}
      description={
        mode === "register"
          ? "Onboard a device into the fleet registry (POST /api/sensors)."
          : "Update registry metadata — readings history is untouched."
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {mode === "register" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="sensor-id">Sensor ID</Label>
              <Input
                id="sensor-id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="e.g. SEN004"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as SensorTypeOption)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Temp/Humidity">Temp/Humidity</SelectItem>
                  <SelectItem value="Magnetic Door">Magnetic Door</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="sensor-location">Location</Label>
          <Input
            id="sensor-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Pharmacy Fridge"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sensor-model">Model</Label>
          <Input
            id="sensor-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. SHT31"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as SensorStatusOption)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-2">
          {mode === "edit" && onDelete ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" /> Decommission
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={saving || !valid}>
            {saving ? "Saving…" : mode === "register" ? "Register Sensor" : "Save Changes"}
          </Button>
        </div>
      </div>
    </RouterDialog>
  );
}

function readingBadgeVariant(status: SensorReading["status"]) {
  if (status === "Critical") return "critical" as const;
  if (status === "Warning") return "warning" as const;
  return "success" as const;
}

function readingTone(status: string) {
  if (status === "Critical") return "bg-red-500/10 text-red-600 dark:text-red-400";
  if (status === "Warning") return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  if (status === "Normal") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}

function RealtimePage() {
  const sensors = useApiQuery(getSensors, [], { pollMs: 15_000 });
  const readings = useApiQuery(getReadings, [], { pollMs: 10_000 });
  const live = sensors.live || readings.live;

  const [registerOpen, setRegisterOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Sensor | null>(null);
  const [deleting, setDeleting] = React.useState<Sensor | null>(null);
  const [mutError, setMutError] = React.useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = React.useState(false);

  const refreshAll = () => {
    sensors.refresh();
    readings.refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    setMutError(null);
    try {
      await deleteSensor(deleting.id);
      setDeleting(null);
      refreshAll();
    } catch (e) {
      setMutError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingBusy(false);
    }
  };

  const readingById = new Map(readings.data.map((r) => [r.sensorId, r]));
  const climateSensors = sensors.data.filter((s) => s.type === "Temp/Humidity");
  const doorSensors = sensors.data.filter((s) => s.type !== "Temp/Humidity");

  return (
    <div className="space-y-8">
      {!live && !readings.loading && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center gap-2 py-3 text-sm text-muted-foreground">
            No live telemetry — check the broker is up (<code>GET /health/ready</code>) and devices
            publish to <code>clinic/sensors/+/telemetry/climate</code>.
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Sensor Fleet</h2>
        <Button onClick={() => setRegisterOpen(true)}>
          <Plus className="h-4 w-4" /> Register Sensor
        </Button>
      </div>
      {mutError && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="py-3 text-sm">Delete failed: {mutError}</CardContent>
        </Card>
      )}
      <SensorDialog
        mode="register"
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onSaved={refreshAll}
      />
      <SensorDialog
        mode="edit"
        sensor={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={refreshAll}
        onDelete={() => {
          if (editing) {
            setDeleting(editing);
            setEditing(null);
          }
        }}
      />
      <RouterDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        trigger={<span className="hidden" />}
        title={deleting ? `Decommission ${deleting.id}?` : "Decommission sensor?"}
        description="Removes the registry entry. Historical readings are kept."
      >
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={deletingBusy}>
            {deletingBusy ? "Deleting…" : "Decommission"}
          </Button>
        </div>
      </RouterDialog>
      {sensors.loading || readings.loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading telemetry…</p>
      ) : sensors.data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No sensors registered yet — onboard a device to see live readings here.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {climateSensors.map((sensor) => {
              const reading = readingById.get(sensor.id);
              const status = reading?.status ?? "Unknown";
              return (
                <Card
                  key={sensor.id}
                  className={sensor.status === "Inactive" ? "opacity-70" : undefined}
                >
                  <CardHeader className="space-y-0 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm font-semibold">
                          {sensor.location}
                        </CardTitle>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {sensor.id} &middot; {sensor.model}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md",
                            readingTone(status),
                          )}
                        >
                          <Thermometer className="h-4 w-4" />
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit ${sensor.id}`}
                          onClick={() => setEditing(sensor)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {reading ? (
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-bold tabular-nums tracking-tight">
                            {reading.temp ?? "--"}°C
                          </span>
                          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                            RH {reading.humidity ?? "--"}%
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant={readingBadgeVariant(reading.status)}>
                            {reading.status}
                          </Badge>
                          {(reading.alerts ?? 0) > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {reading.alerts} active alert{(reading.alerts ?? 0) > 1 ? "s" : ""}
                            </span>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {sensor.status}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="py-2 text-sm text-muted-foreground">
                          No readings yet — waiting for telemetry from {sensor.id}.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="secondary">No data</Badge>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {sensor.status}
                          </span>
                        </div>
                      </>
                    )}
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
                  <Card
                    key={sensor.id}
                    className={sensor.status === "Inactive" ? "opacity-70" : undefined}
                  >
                    <CardHeader className="space-y-0 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-sm font-semibold">
                            {sensor.location}
                          </CardTitle>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {sensor.id}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <span
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-md",
                              !reading
                                ? "bg-muted text-muted-foreground"
                                : isOpen
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            )}
                          >
                            {isOpen ? (
                              <DoorOpen className="h-4 w-4" />
                            ) : (
                              <DoorClosed className="h-4 w-4" />
                            )}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Edit ${sensor.id}`}
                            onClick={() => setEditing(sensor)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {reading ? (
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
                          <Badge variant={readingBadgeVariant(reading.status)} className="ml-auto">
                            {reading.status}
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            No status reports yet.
                          </span>
                          <Badge variant="secondary" className="ml-auto">
                            No data
                          </Badge>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">{sensor.status}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
