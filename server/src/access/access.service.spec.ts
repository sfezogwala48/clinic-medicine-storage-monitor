import { describe, expect, it, vi } from "vite-plus/test";
import type { AlertsService } from "../alerts/alerts.service.js";
import type { SettingsService } from "../settings/settings.service.js";
import type { SensorsService } from "../sensors/sensors.service.js";
import { AccessService } from "./access.service.js";
import type { AccessEventEntity } from "./access-event.entity.js";

const SEC = 1_000;
const NOW = Date.parse("2026-10-04T18:00:00Z");

function event(open: boolean, secondsAgo: number): AccessEventEntity {
  return {
    id: `E${secondsAgo}`,
    sensorId: "FRIDGE-01",
    container: "Fridge",
    open,
    occurredAt: new Date(NOW - secondsAgo * SEC).toISOString(),
    durationSec: null,
    reason: "Staff access",
  };
}

/** `events` = what the repository holds for the single sensor FRIDGE-01. */
function setup(events: AccessEventEntity[], limitSec = 10) {
  const evaluateDoorOpen = vi.fn(async () => []);
  const byTime = [...events].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  const repo = {
    createQueryBuilder: () => {
      const qb = {
        select: () => qb,
        distinct: () => qb,
        getRawMany: async () => (events.length ? [{ sensorId: "FRIDGE-01" }] : []),
      };
      return qb;
    },
    findOne: vi.fn(
      async ({
        where,
        order,
      }: {
        where: Record<string, unknown>;
        order: { occurredAt: string };
      }) => {
        const wantOpen = where.open as boolean | undefined;
        let rows = byTime.filter((e) => wantOpen === undefined || e.open === wantOpen);
        if (where.occurredAt) {
          // MoreThan(lastClose.occurredAt)
          const after = Date.parse(String((where.occurredAt as { value: unknown }).value));
          rows = rows.filter((e) => Date.parse(e.occurredAt) > after);
        }
        return (order.occurredAt === "ASC" ? [...rows].reverse() : rows)[0] ?? null;
      },
    ),
  };
  const service = new AccessService(
    repo as never,
    {} as SensorsService,
    { getThresholds: async () => ({ doorOpenLimitSec: limitSec }) } as unknown as SettingsService,
    { evaluateDoorOpen } as unknown as AlertsService,
  );
  return { service, evaluateDoorOpen };
}

describe("AccessService.checkOpenDoors", () => {
  it("raises once the door has been open past the limit, measured from the first open event", async () => {
    // closed 20 s ago, then reported open every cycle since 12 s ago
    const { service, evaluateDoorOpen } = setup([
      event(false, 20),
      event(true, 12),
      event(true, 6),
      event(true, 0),
    ]);

    await service.checkOpenDoors(NOW);

    expect(evaluateDoorOpen).toHaveBeenCalledOnce();
    expect(evaluateDoorOpen).toHaveBeenCalledWith("FRIDGE-01", 12, "Fridge");
  });

  it("does nothing while the door has been open for less than the limit (10 s)", async () => {
    const { service, evaluateDoorOpen } = setup([event(false, 20), event(true, 3), event(true, 0)]);

    await service.checkOpenDoors(NOW);

    expect(evaluateDoorOpen).not.toHaveBeenCalled();
  });

  it("does nothing when the door is currently closed, however long it was open before", async () => {
    const { service, evaluateDoorOpen } = setup([
      event(true, 30),
      event(true, 20),
      event(false, 0),
    ]);

    await service.checkOpenDoors(NOW);

    expect(evaluateDoorOpen).not.toHaveBeenCalled();
  });

  it("uses the first event ever when the door has never been closed", async () => {
    const { service, evaluateDoorOpen } = setup([event(true, 30), event(true, 0)]);

    await service.checkOpenDoors(NOW);

    expect(evaluateDoorOpen).toHaveBeenCalledWith("FRIDGE-01", 30, "Fridge");
  });
});
