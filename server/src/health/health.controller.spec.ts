import { ConfigService } from "@nestjs/config";
import type {
  DiskHealthIndicator,
  HealthCheckService,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { describe, expect, it, vi } from "vite-plus/test";
import { HealthController } from "./health.controller.js";

function createController() {
  const check = vi.fn(async () => ({ status: "ok" as const }));
  const config = {
    get: vi.fn((_key: string, fallback?: string) => fallback),
  } as unknown as ConfigService;
  const controller = new HealthController(
    { check } as unknown as HealthCheckService,
    {} as unknown as TypeOrmHealthIndicator,
    {} as unknown as DiskHealthIndicator,
    {} as unknown as MemoryHealthIndicator,
    {} as unknown as MicroserviceHealthIndicator,
    config,
  );
  return { controller, check };
}

describe("HealthController", () => {
  it("liveness should return { status: 'ok' } without touching dependencies", () => {
    const { controller, check } = createController();

    expect(controller.liveness()).toEqual({ status: "ok" });
    expect(check).not.toHaveBeenCalled();
  });

  it("time should return the current UTC time in whole seconds with a Z suffix", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T18:00:15.789Z"));
    try {
      const { controller } = createController();

      expect(controller.time()).toEqual({ utc: "2026-10-04T18:00:15Z" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("readiness should delegate to the terminus health check", async () => {
    const { controller, check } = createController();

    const result = await controller.readiness();

    expect(check).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: "ok" });
  });
});
