/* Domain types shared by the dashboard. All values come from the API —
   this module deliberately contains no seed or demo data. */

export type Role = "admin" | "supervisor" | "staff";

export interface Sensor {
  id: string;
  type: "Temp/Humidity" | "Magnetic Door";
  location: string;
  model: string;
  status: "Active" | "Inactive";
}

export interface SensorReading {
  sensorId: string;
  temp?: number;
  humidity?: number;
  containerOpen?: boolean;
  status: "Normal" | "Warning" | "Critical";
  alerts: number;
}

export type AlertSeverity = "Critical" | "High" | "Medium";
export type AlertStatus = "Active" | "Resolved";

export interface Alert {
  id: string;
  sensorId: string;
  type: string;
  value: string;
  time: string;
  severity: AlertSeverity;
  status: AlertStatus;
}

export interface AccessEvent {
  id: string;
  sensorId: string;
  container: string;
  open: boolean;
  time: string;
  duration: string;
  reason: string;
}

export interface Notification {
  id: string;
  alertId: string;
  type: "SMS" | "Buzzer";
  recipient: string;
  message: string;
}

export interface Thresholds {
  fridgeMin: number;
  fridgeMax: number;
  roomMax: number;
  doorOpenLimitMin: number;
}

/** Neutral form state before the server responds — not sample data. */
export const EMPTY_THRESHOLDS: Thresholds = {
  fridgeMin: 0,
  fridgeMax: 0,
  roomMax: 0,
  doorOpenLimitMin: 0,
};

export interface AppUser {
  name: string;
  role: Role;
  contact: string;
  lastLogin: string;
  status: "Active" | "Disabled";
}
