import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BellRing, Check, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  FALLBACK,
  getNotificationSettings,
  getThresholds,
  updateNotificationSettings,
  updateThresholds,
  useApiQuery,
  type NotificationSettings,
} from "@/lib/api";
import { DEFAULT_THRESHOLDS } from "@/data/clinic";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const DEFAULT_NOTIF: NotificationSettings = {
  smsEnabled: true,
  buzzerEnabled: true,
  emailEnabled: false,
  recipients: ["+27731234567 (Primary)", "+27721111111 (Supervisor)"],
};

function SettingsPage() {
  const thresholdsQuery = useApiQuery(getThresholds, DEFAULT_THRESHOLDS);
  const notifQuery = useApiQuery(getNotificationSettings, DEFAULT_NOTIF);

  const [thresholds, setThresholds] = React.useState(DEFAULT_THRESHOLDS);
  const [notif, setNotif] = React.useState<NotificationSettings>(DEFAULT_NOTIF);
  const [recipientsText, setRecipientsText] = React.useState(DEFAULT_NOTIF.recipients.join("\n"));
  const [saving, setSaving] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savingNotif, setSavingNotif] = React.useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = React.useState<string | null>(null);

  // Hydrate form state once the server responds.
  React.useEffect(() => {
    if (thresholdsQuery.live) setThresholds(thresholdsQuery.data);
  }, [thresholdsQuery.live, thresholdsQuery.data]);
  React.useEffect(() => {
    if (notifQuery.live) {
      setNotif(notifQuery.data);
      setRecipientsText(
        (notifQuery.data.recipients.length > 0
          ? notifQuery.data.recipients
          : FALLBACK.sensors.map(() => "")
        )
          .filter(Boolean)
          .join("\n") || DEFAULT_NOTIF.recipients.join("\n"),
      );
    }
  }, [notifQuery.live, notifQuery.data]);

  const set = (key: keyof typeof thresholds) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaving("idle");
    setThresholds((prev) => ({ ...prev, [key]: Number(e.target.value) }));
  };

  const saveThresholds = async () => {
    setSaving("saving");
    setError(null);
    try {
      // PUT /api/thresholds also pushes a snapshot to clinic/actuators/all/config/thresholds.
      const saved = await updateThresholds(thresholds);
      setThresholds(saved);
      setSaving("saved");
    } catch (e) {
      setSaving("error");
      setError(
        e instanceof ApiError
          ? `Save failed (${e.status}): ${e.message}`
          : "Save failed — is the server running?",
      );
    }
  };

  const saveNotif = async () => {
    setSavingNotif("saving");
    setError(null);
    const recipients = recipientsText
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);
    try {
      const saved = await updateNotificationSettings({ ...notif, recipients });
      setNotif(saved);
      setRecipientsText(saved.recipients.join("\n"));
      setSavingNotif("saved");
    } catch (e) {
      setSavingNotif("error");
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const offline = !thresholdsQuery.live && !thresholdsQuery.loading;

  return (
    <div className="space-y-4">
      {offline && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-3 text-sm text-muted-foreground">
            Server unreachable — editing defaults locally. PUTs will fail until the backend is up.
          </CardContent>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="py-3 text-sm">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4" /> Alert Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Defaults: fridge 2–8 °C, room max 25 °C, humidity 30–60 %, door-open limit 5 min.
            </p>
            <div className="space-y-2">
              <Label htmlFor="fridge-min">Fridge Min Temp (°C)</Label>
              <Input
                id="fridge-min"
                type="number"
                value={thresholds.fridgeMin}
                onChange={set("fridgeMin")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fridge-max">Fridge Max Temp (°C)</Label>
              <Input
                id="fridge-max"
                type="number"
                value={thresholds.fridgeMax}
                onChange={set("fridgeMax")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-max">Room Max Temp (°C)</Label>
              <Input
                id="room-max"
                type="number"
                value={thresholds.roomMax}
                onChange={set("roomMax")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="door-limit">Door Open Limit (Minutes)</Label>
              <Input
                id="door-limit"
                type="number"
                value={thresholds.doorOpenLimitMin}
                onChange={set("doorOpenLimitMin")}
              />
            </div>
            <Button onClick={saveThresholds} disabled={saving === "saving"}>
              {saving === "saved" && <Check className="h-4 w-4" />}
              {saving === "saving"
                ? "Saving…"
                : saving === "saved"
                  ? "Thresholds Saved"
                  : saving === "error"
                    ? "Retry Save"
                    : "Save Thresholds"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4" /> Notification Config
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Buzzer alerts require <code>buzzerEnabled</code> + an Active actuator sharing the
              sensor&apos;s location.
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={notif.smsEnabled}
                onChange={(e) => {
                  setSavingNotif("idle");
                  setNotif((p) => ({ ...p, smsEnabled: e.target.checked }));
                }}
                className="h-4 w-4 accent-primary"
              />
              Enable SMS Alerts
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={notif.buzzerEnabled}
                onChange={(e) => {
                  setSavingNotif("idle");
                  setNotif((p) => ({ ...p, buzzerEnabled: e.target.checked }));
                }}
                className="h-4 w-4 accent-primary"
              />
              Enable Local Buzzer
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={notif.emailEnabled}
                onChange={(e) => {
                  setSavingNotif("idle");
                  setNotif((p) => ({ ...p, emailEnabled: e.target.checked }));
                }}
                className="h-4 w-4 accent-primary"
              />
              Enable Email Digest
            </label>

            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients (one per line)</Label>
              <textarea
                id="recipients"
                value={recipientsText}
                onChange={(e) => {
                  setSavingNotif("idle");
                  setRecipientsText(e.target.value);
                }}
                rows={3}
                className="w-full rounded-md border border-input bg-background p-3 text-sm"
              />
            </div>
            <Button variant="outline" onClick={saveNotif} disabled={savingNotif === "saving"}>
              {savingNotif === "saved" && <Check className="h-4 w-4" />}
              {savingNotif === "saving"
                ? "Saving…"
                : savingNotif === "saved"
                  ? "Settings Saved"
                  : "Save Notification Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
