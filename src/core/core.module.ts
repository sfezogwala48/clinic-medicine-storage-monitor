import { Global, Module } from "@nestjs/common";
import { AppLogger } from "./logger/app-logger.service.js";

/**
 * Shared kernel: custom logger (also used as the Nest application logger
 * via `app.useLogger()` in main.ts) plus neverthrow helpers in
 * `./result/result.js` (pure functions, no provider needed).
 */
@Global()
@Module({
  providers: [AppLogger],
  exports: [AppLogger],
})
export class CoreModule {}
