import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import type { Request, Response } from "express";

/**
 * OpenAPI document plus Scalar UI. Mounted by main.ts and reused in e2e
 * (which boots the module tree directly, bypassing main.ts).
 */
export function setupApiReference(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("Clinic Medicine Storage Monitor API")
    .setDescription(
      "Medicine storage telemetry ingested over MQTT, exposed over HTTP, with sqlite persistence.",
    )
    .setVersion("1.0")
    .addTag("health", "Liveness and readiness probes")
    .addTag("telemetry", "Storage device readings")
    .addTag("sensors", "Sensor registry")
    .addTag("readings", "Latest readings and temperature trend")
    .addTag("alerts", "Threshold violations")
    .addTag("access", "Container access events")
    .addTag("notifications", "SMS and buzzer dispatch log")
    .addTag("dashboard", "Dashboard aggregates")
    .addTag("reports", "Compliance reports")
    .addTag("settings", "Thresholds and notification settings")
    .addTag("users", "System users and audit trail")
    .addTag("auth", "Demo role login")
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Raw OpenAPI JSON for tooling, Scalar UI at /reference (recommended Scalar pattern).
  app.use("/openapi.json", (_req: Request, res: Response) => {
    res.json(document);
  });
  app.use("/reference", apiReference({ url: "/openapi.json" }));
}
