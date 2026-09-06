import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";
import { AppLogger } from "./core/logger/app-logger.service.js";
import { setupApiReference } from "./docs.js";
import { buildMqttOptions } from "./mqtt/mqtt.options.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLogger);
  app.useLogger(logger);

  setupApiReference(app);

  // Hybrid application: HTTP API plus the MQTT microservice (mosquitto).
  // inheritAppConfig shares the logger, pipes, and filters with the microservice.
  const config = app.get(ConfigService);
  app.connectMicroservice(buildMqttOptions(config), { inheritAppConfig: true });
  await app.startAllMicroservices();

  app.enableShutdownHooks();

  const port = Number(config.get<string>("PORT", "3000"));
  await app.listen(port);
  logger.log(`Server listening on port ${port}`, "Bootstrap");
}
await bootstrap();
