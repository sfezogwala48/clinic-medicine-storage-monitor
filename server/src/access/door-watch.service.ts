import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { AppLogger } from "../core/logger/app-logger.service.js";
import { AccessService } from "./access.service.js";

// Well under the door-open limit (10 s by default) so the buzzer starts promptly.
const CHECK_INTERVAL_MS = 5_000;

/** Periodically checks for doors left open past the dashboard limit (see AccessService.checkOpenDoors). */
@Injectable()
export class DoorWatchService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly access: AccessService,
    private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.access.checkOpenDoors().catch((e: unknown) => {
        this.logger.warn(
          `Open-door check failed: ${e instanceof Error ? e.message : String(e)}`,
          "DoorWatch",
        );
      });
    }, CHECK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }
}
