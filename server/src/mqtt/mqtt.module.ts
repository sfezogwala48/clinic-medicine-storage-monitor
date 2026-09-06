import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientsModule } from "@nestjs/microservices";
import { TELEMETRY_CLIENT, buildMqttClientOptions } from "./mqtt.options.js";
import { MqttPublishService } from "./mqtt-publish.service.js";

/** Shared MQTT publish client (server -> broker -> devices). */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: TELEMETRY_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => buildMqttClientOptions(config),
      },
    ]),
  ],
  providers: [MqttPublishService],
  exports: [MqttPublishService],
})
export class MqttModule {}
