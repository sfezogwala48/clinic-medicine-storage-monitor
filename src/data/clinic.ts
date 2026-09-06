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

export const SENSORS: Sensor[] = [
  {
    id: "SEN001",
    type: "Temp/Humidity",
    location: "Medicine Storage Room A",
    model: "SHT31",
    status: "Active",
  },
  {
    id: "SEN002",
    type: "Temp/Humidity",
    location: "Vaccine Cold Chain",
    model: "SHT31",
    status: "Active",
  },
  {
    id: "SEN003",
    type: "Temp/Humidity",
    location: "Insulin Storage",
    model: "SHT31",
    status: "Active",
  },
  {
    id: "SEN005",
    type: "Magnetic Door",
    location: "Medicine Cabinet A",
    model: "Reed Switch",
    status: "Active",
  },
  {
    id: "SEN006",
    type: "Magnetic Door",
    location: "Vaccine Container",
    model: "Reed Switch",
    status: "Active",
  },
];

export const READINGS: SensorReading[] = [
  { sensorId: "SEN001", temp: 25.1, humidity: 49.0, status: "Warning", alerts: 1 },
  { sensorId: "SEN002", temp: 1.8, humidity: 45.0, status: "Critical", alerts: 1 },
  { sensorId: "SEN003", temp: 4.2, humidity: 52.0, status: "Normal", alerts: 0 },
  { sensorId: "SEN005", containerOpen: false, status: "Normal", alerts: 0 },
  { sensorId: "SEN006", containerOpen: false, status: "Critical", alerts: 1 },
];

export const ALERTS: Alert[] = [
  {
    id: "ALT001",
    sensorId: "SEN001",
    type: "High Temperature",
    value: "25.1°C",
    time: "08:15:00",
    severity: "High",
    status: "Active",
  },
  {
    id: "ALT002",
    sensorId: "SEN002",
    type: "Low Temperature",
    value: "1.8°C",
    time: "09:30:00",
    severity: "Critical",
    status: "Resolved",
  },
  {
    id: "ALT005",
    sensorId: "SEN005",
    type: "Container Opened",
    value: "Open",
    time: "08:15:30",
    severity: "Medium",
    status: "Resolved",
  },
  {
    id: "ALT006",
    sensorId: "SEN006",
    type: "Unauthorized Access",
    value: "Breach",
    time: "09:45:15",
    severity: "Critical",
    status: "Active",
  },
  {
    id: "ALT007",
    sensorId: "SEN005",
    type: "Extended Access",
    value: "5 min",
    time: "08:20:30",
    severity: "Medium",
    status: "Resolved",
  },
];

export const ACCESS_LOG: AccessEvent[] = [
  {
    id: "CST002",
    sensorId: "SEN005",
    container: "Medicine Cabinet A",
    open: true,
    time: "08:15:30",
    duration: "5m",
    reason: "Staff access",
  },
  {
    id: "CST003",
    sensorId: "SEN005",
    container: "Medicine Cabinet A",
    open: false,
    time: "08:20:30",
    duration: "-",
    reason: "Closed by staff",
  },
  {
    id: "CST005",
    sensorId: "SEN006",
    container: "Vaccine Container",
    open: true,
    time: "09:45:15",
    duration: "12m",
    reason: "Unauthorized attempt",
  },
  {
    id: "CST006",
    sensorId: "SEN006",
    container: "Vaccine Container",
    open: false,
    time: "09:57:15",
    duration: "-",
    reason: "Closed",
  },
];

export const NOTIFICATIONS: Notification[] = [
  {
    id: "NOT007",
    alertId: "ALT006",
    type: "SMS",
    recipient: "+27731234567",
    message: "ALERT: Vaccine Container unauthorized access detected",
  },
  {
    id: "NOT008",
    alertId: "ALT006",
    type: "SMS",
    recipient: "+27721111111",
    message: "Supervisor notified: Vaccine Container breach",
  },
  {
    id: "NOT009",
    alertId: "ALT006",
    type: "Buzzer",
    recipient: "Local System",
    message: "Buzzer + LED activated",
  },
];

export const TEMPERATURE_TREND_24H = [22, 23, 22, 24, 25, 25.1, 24, 23, 22, 22, 23, 24];

export interface Thresholds {
  fridgeMin: number;
  fridgeMax: number;
  roomMax: number;
  doorOpenLimitMin: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  fridgeMin: 2,
  fridgeMax: 8,
  roomMax: 25,
  doorOpenLimitMin: 5,
};

export interface AppUser {
  name: string;
  role: Role;
  contact: string;
  lastLogin: string;
  status: "Active" | "Disabled";
}

export const USERS: AppUser[] = [
  {
    name: "Dr. Ajibola",
    role: "admin",
    contact: "admin@clinic.co.za",
    lastLogin: "Today, 08:00",
    status: "Active",
  },
  {
    name: "Nurse Dlamini",
    role: "supervisor",
    contact: "+27721111111",
    lastLogin: "Today, 09:45",
    status: "Active",
  },
  {
    name: "Pharmacist Mokoena",
    role: "staff",
    contact: "+27731234567",
    lastLogin: "Yesterday",
    status: "Active",
  },
];

export function readingFor(sensorId: string): SensorReading | undefined {
  return READINGS.find((r) => r.sensorId === sensorId);
}

export function activeAlerts(): Alert[] {
  return ALERTS.filter((a) => a.status === "Active");
}
