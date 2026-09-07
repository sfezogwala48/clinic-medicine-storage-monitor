import { defineRailway, github, preserve, project, service, volume } from "railway/iac";

const REPO = "sfezogwala48/clinic-medicine-storage-monitor";

export default defineRailway(() => {
  const serverData = volume("server-data");

  // Public MQTT broker for IoT devices. Exposed via TCP proxy on 1883.
  // Devices connect to the generated TCP endpoint (xxx.proxy.rlwy.net:<port>).
  const mosquitto = service("mosquitto", {
    source: github(REPO, { branch: "main" }),
    build: { builder: "DOCKERFILE", dockerfilePath: "mosquitto/Containerfile" },
    tcp: [1883],
  });

  const server = service("server", {
    source: github(REPO, { branch: "main" }),
    build: { builder: "DOCKERFILE", dockerfilePath: "server/Containerfile" },
    healthcheck: "/health",
    healthcheckTimeout: 30,
    variables: {
      // Railway injects PORT; the API listens on it (see server/src/main.ts).
      // SQLite lives on the attached volume so data survives deploys.
      DATABASE_PATH: "/app/data/app.sqlite",
      DB_SYNCHRONIZE: "true",
      DB_LOGGING: "false",
      LOG_LEVEL: "log",
      LOG_FORMAT: "json",
      // Internal traffic stays on the private network.
      MQTT_URL: "mqtt://mosquitto.railway.internal:1883",
      MQTT_CLIENT_ID: "clinic-monitor-server",
      // Dashboard public URL (resolves once the dashboard service domain exists).
      CORS_ORIGINS: "https://${{dashboard.RAILWAY_PUBLIC_DOMAIN}}",
      // Secrets — set real values in the Railway dashboard; never commit them.
      JWT_SECRET: preserve(),
      SEED_ADMIN_PASSWORD: preserve(),
    },
    volumeMounts: {
      "/app/data": serverData,
    },
  });

  const dashboard = service("dashboard", {
    source: github(REPO, { branch: "main" }),
    build: { builder: "DOCKERFILE", dockerfilePath: "dashboard/Containerfile" },
    healthcheck: "/",
    variables: {
      // nginx listens on 8080; keep Railway's PORT in sync.
      PORT: "8080",
      // Baked into the SPA at build time (see dashboard/Containerfile ARG).
      // After generating the server domain, redeploy the dashboard once
      // so the built bundle points at the public API.
      VITE_API_BASE_URL: "https://${{server.RAILWAY_PUBLIC_DOMAIN}}",
    },
  });

  return project("clinic-medicine-storage-monitor", {
    resources: [mosquitto, server, dashboard],
  });
});
