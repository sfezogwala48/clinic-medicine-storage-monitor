import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";
import { AppLogger } from "./core/logger/app-logger.service.js";
import { setupApiReference } from "./docs.js";
import { buildMqttOptions } from "./mqtt/mqtt.options.js";

async function bootstrap() {
  for (const name of ["JWT_SECRET", "SEED_ADMIN_PASSWORD"]) {
    if (!process.env[name]) {
      throw new Error(
        `Missing ${name} — define it in server/.env (see server/.env.example) before booting.`,
      );
    }
  }
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLogger);
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  setupApiReference(app);

  // Hybrid application: HTTP API plus the MQTT microservice (mosquitto).
  // inheritAppConfig shares the logger, pipes, and filters with the microservice.
  const config = app.get(ConfigService);
  app.connectMicroservice(buildMqttOptions(config), { inheritAppConfig: true });
  await app.startAllMicroservices();

  // CORS for browser clients (dashboard). CORS_ORIGINS is a comma-separated
  // allowlist; empty reflects the request origin (dev default), "*" allows all.
  const corsRaw = (config.get<string>("CORS_ORIGINS", "") ?? "").trim();
  const corsOrigin =
    corsRaw === ""
      ? true
      : corsRaw === "*"
        ? "*"
        : corsRaw
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean);
  app.enableCors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });

  app.enableShutdownHooks();

  const port = Number(config.get<string>("PORT", "3000"));
  await app.listen(port);
  logger.log(`Server listening on port ${port}`, "Bootstrap");
}
await bootstrap();
