import { describe, expect, it } from "vite-plus/test";
import { SAST_OFFSET, SAST_OFFSET_MS, nowSast, sastDateTime, toSast } from "./sast.js";

describe("nowSast", () => {
  it("stamps clinic-local time with the +02:00 offset", () => {
    const before = Date.now();
    const value = nowSast();
    const after = Date.now();

    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+02:00$/);
    const parsed = Date.parse(value);
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  it("agrees with the constants used for device timestamps", () => {
    expect(SAST_OFFSET).toBe("+02:00");
    expect(SAST_OFFSET_MS).toBe(2 * 60 * 60 * 1000);
  });

  it("normalizes UTC, offset and legacy sqlite values to SAST", () => {
    expect(toSast("2026-10-14T00:00:00.000Z")).toBe("2026-10-14T02:00:00.000+02:00");
    expect(toSast("2026-10-14 00:00:00.000")).toBe("2026-10-14T02:00:00.000+02:00");
    expect(toSast("2026-10-14T02:00:00.000+02:00")).toBe("2026-10-14T02:00:00.000+02:00");
    expect(sastDateTime.to(null)).toBeNull();
  });
});
