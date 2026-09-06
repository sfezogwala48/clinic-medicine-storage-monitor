import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Transport } from "@nestjs/microservices";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { mqttUrl } from "../mqtt/mqtt.options.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  /** Liveness: the process is up. Deliberately cheap — no dependency checks. */
  @Get()
  @ApiOperation({ summary: "Liveness probe (no dependency checks)" })
  @ApiResponse({ status: 200, description: "Process is up" })
  liveness() {
    return { status: "ok" as const };
  }

  /** Readiness: sqlite, MQTT broker, disk space, and memory can serve traffic. */
  @Get("ready")
  @ApiOperation({ summary: "Readiness probe (sqlite, MQTT, disk, memory)" })
  @ApiResponse({ status: 200, description: "All dependencies healthy" })
  @ApiResponse({ status: 503, description: "One or more dependencies unhealthy" })
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck("database"),
      () =>
        this.microservice.pingCheck("mqtt", {
          transport: Transport.MQTT,
          options: { url: mqttUrl(this.config) },
          timeout: 5000,
        }),
      () => this.disk.checkStorage("storage", { path: "/", thresholdPercent: 0.9 }),
      () => this.memory.checkHeap("memory_heap", 300 * 1024 * 1024),
    ]);
  }
}
