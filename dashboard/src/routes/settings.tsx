import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BellRing, Check, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_THRESHOLDS } from "@/data/clinic";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [thresholds, setThresholds] = React.useState(DEFAULT_THRESHOLDS);
  const [saved, setSaved] = React.useState(false);
  const [smsEnabled, setSmsEnabled] = React.useState(true);
  const [buzzerEnabled, setBuzzerEnabled] = React.useState(true);
  const [emailEnabled, setEmailEnabled] = React.useState(false);

  const set = (key: keyof typeof thresholds) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setThresholds((prev) => ({ ...prev, [key]: Number(e.target.value) }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" /> Alert Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <Button onClick={() => setSaved(true)}>
            {saved && <Check className="h-4 w-4" />}
            {saved ? "Thresholds Saved" : "Save Thresholds"}
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
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Enable SMS Alerts
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={buzzerEnabled}
              onChange={(e) => setBuzzerEnabled(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Enable Local Buzzer
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Enable Email Digest
          </label>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Recipients</h3>
            <div className="rounded-md bg-muted p-3 text-sm">
              +27731234567 (Primary)
              <br />
              +27721111111 (Supervisor)
            </div>
          </div>
          <Button variant="outline">Edit Recipients</Button>
        </CardContent>
      </Card>
    </div>
  );
}
