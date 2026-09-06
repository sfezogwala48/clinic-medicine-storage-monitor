import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BellRing, Check, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ApiError,
  getNotificationSettings,
  getThresholds,
  updateNotificationSettings,
  updateThresholds,
  useApiQuery,
  type NotificationSettings,
} from "@/lib/api";
import { EMPTY_THRESHOLDS, type Thresholds } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const EMPTY_NOTIF: NotificationSettings = {
  smsEnabled: false,
  buzzerEnabled: false,
  emailEnabled: false,
  recipients: [],
};

type SaveState = "idle" | "saving" | "saved" | "error";

function validateThresholds(t: Thresholds): string | null {
  const nums: Array<[string, number]> = [
    ["Fridge minimum", t.fridgeMin],
    ["Fridge maximum", t.fridgeMax],
    ["Room maximum", t.roomMax],
    ["Door-open limit", t.doorOpenLimitMin],
  ];
  for (const [label, v] of nums) {
    if (!Number.isFinite(v)) return `${label} must be a number.`;
  }
  if (t.fridgeMin >= t.fridgeMax) return "Fridge minimum must be below the maximum.";
  if (t.fridgeMin < -30 || t.fridgeMax > 80) return "Fridge range must stay within -30…80 °C.";
  if (t.roomMax < -30 || t.roomMax > 80) return "Room maximum must stay within -30…80 °C.";
  if (t.doorOpenLimitMin < 0 || t.doorOpenLimitMin > 120) {
    return "Door-open limit must be between 0 and 120 minutes.";
  }
  return null;
}

function ThresholdField({
  id,
  label,
  unit,
  hint,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  hint: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} <span className="font-normal text-muted-foreground">({unit})</span>
      </Label>
      <Input
        id={id}
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ChannelRow({
  id,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {title}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(c) => onChange(c === true)}
      />
    </div>
  );
}

function SaveButton({
  state,
  dirty,
  idleLabel,
  onClick,
}: {
  state: SaveState;
  dirty: boolean;
  idleLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button onClick={onClick} disabled={state === "saving" || (!dirty && state !== "error")}>
        {state === "saved" && <Check className="h-4 w-4" />}
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : idleLabel}
      </Button>
      {dirty && state !== "saving" && (
        <span className="text-xs text-muted-foreground">Unsaved changes</span>
      )}
    </div>
  );
}

function SettingsPage() {
  const thresholdsQuery = useApiQuery(getThresholds, EMPTY_THRESHOLDS);
  const notifQuery = useApiQuery(getNotificationSettings, EMPTY_NOTIF);

  const [thresholds, setThresholds] = React.useState(EMPTY_THRESHOLDS);
  const [notif, setNotif] = React.useState<NotificationSettings>(EMPTY_NOTIF);
  const [recipientsText, setRecipientsText] = React.useState("");
  const [thresholdsDirty, setThresholdsDirty] = React.useState(false);
  const [notifDirty, setNotifDirty] = React.useState(false);
  const [saving, setSaving] = React.useState<SaveState>("idle");
  const [savingNotif, setSavingNotif] = React.useState<SaveState>("idle");
  const [error, setError] = React.useState<string | null>(null);

  // Hydrate form state once the server responds.
  React.useEffect(() => {
    if (thresholdsQuery.live) {
      setThresholds(thresholdsQuery.data);
      setThresholdsDirty(false);
    }
  }, [thresholdsQuery.live, thresholdsQuery.data]);
  React.useEffect(() => {
    if (notifQuery.live) {
      setNotif(notifQuery.data);
      setRecipientsText(notifQuery.data.recipients.join("\n"));
      setNotifDirty(false);
    }
  }, [notifQuery.live, notifQuery.data]);

  const loading = thresholdsQuery.loading || notifQuery.loading;
  const offline = !thresholdsQuery.live && !thresholdsQuery.loading;
  const thresholdError = validateThresholds(thresholds);

  const set = (key: keyof Thresholds) => (value: number) => {
    setSaving("idle");
    setThresholdsDirty(true);
    setThresholds((prev) => ({ ...prev, [key]: value }));
  };

  const setChannel = (key: "smsEnabled" | "buzzerEnabled" | "emailEnabled") => (value: boolean) => {
    setSavingNotif("idle");
    setNotifDirty(true);
    setNotif((prev) => ({ ...prev, [key]: value }));
  };

  const saveThresholds = async () => {
    if (validateThresholds(thresholds)) return;
    setSaving("saving");
    setError(null);
    try {
      const saved = await updateThresholds(thresholds);
      setThresholds(saved);
      setThresholdsDirty(false);
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
      setNotifDirty(false);
      setSavingNotif("saved");
    } catch (e) {
      setSavingNotif("error");
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <div className="space-y-4">
      {offline && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-3 text-sm text-muted-foreground">
            Server unreachable — settings will load once the backend is up.
          </CardContent>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="py-3 text-sm">{error}</CardContent>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4" /> Alert Thresholds
            </CardTitle>
            <CardDescription>
              Readings outside these limits raise alerts. Changes apply to new readings immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ThresholdField
                id="fridge-min"
                label="Fridge minimum"
                unit="°C"
                hint="Alert below this temperature."
                value={thresholds.fridgeMin}
                disabled={loading || offline}
                onChange={set("fridgeMin")}
              />
              <ThresholdField
                id="fridge-max"
                label="Fridge maximum"
                unit="°C"
                hint="Alert above this temperature."
                value={thresholds.fridgeMax}
                disabled={loading || offline}
                onChange={set("fridgeMax")}
              />
            </div>
            <ThresholdField
              id="room-max"
              label="Room maximum"
              unit="°C"
              hint="Alert when the room gets hotter than this."
              value={thresholds.roomMax}
              disabled={loading || offline}
              onChange={set("roomMax")}
            />
            <ThresholdField
              id="door-limit"
              label="Door-open limit"
              unit="minutes"
              hint="Alert when a door stays open longer than this. Use 0 to alert on any opening."
              value={thresholds.doorOpenLimitMin}
              disabled={loading || offline}
              onChange={set("doorOpenLimitMin")}
            />
            {thresholdError && thresholdsDirty && (
              <p className={cn("text-sm text-red-600")}>{thresholdError}</p>
            )}
            <SaveButton
              state={saving}
              dirty={thresholdsDirty && !thresholdError}
              idleLabel="Save Thresholds"
              onClick={saveThresholds}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4" /> Notifications
            </CardTitle>
            <CardDescription>Choose how alerts reach the team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChannelRow
              id="notif-sms"
              title="SMS alerts"
              description="Text new alerts to the recipients below."
              checked={notif.smsEnabled}
              disabled={loading || offline}
              onChange={setChannel("smsEnabled")}
            />
            <ChannelRow
              id="notif-buzzer"
              title="On-site buzzer"
              description="Sound the buzzer at the sensor's location. Needs an active buzzer installed there."
              checked={notif.buzzerEnabled}
              disabled={loading || offline}
              onChange={setChannel("buzzerEnabled")}
            />
            <ChannelRow
              id="notif-email"
              title="Email digest"
              description="A daily summary email to the recipients below."
              checked={notif.emailEnabled}
              disabled={loading || offline}
              onChange={setChannel("emailEnabled")}
            />

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="recipients">Recipients</Label>
              <textarea
                id="recipients"
                value={recipientsText}
                disabled={loading || offline}
                onChange={(e) => {
                  setSavingNotif("idle");
                  setNotifDirty(true);
                  setRecipientsText(e.target.value);
                }}
                rows={3}
                placeholder="+27730000000"
                className="w-full rounded-md border border-input bg-background p-3 text-sm placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">One phone number or email per line.</p>
            </div>
            <SaveButton
              state={savingNotif}
              dirty={notifDirty}
              idleLabel="Save Notifications"
              onClick={saveNotif}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
