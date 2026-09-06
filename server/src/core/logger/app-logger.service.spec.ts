import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { AppLogger } from "./app-logger.service.js";

describe("AppLogger", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should write log lines with context to stdout", () => {
    const logger = new AppLogger();

    logger.log("hello", "TestContext");

    expect(stdoutSpy).toHaveBeenCalledOnce();
    const line = String(stdoutSpy.mock.calls[0]?.[0]);
    expect(line).toContain("hello");
    expect(line).toContain("TestContext");
  });

  it("should write errors to stderr", () => {
    const logger = new AppLogger();

    logger.error("boom", "TestContext");

    expect(stderrSpy).toHaveBeenCalledOnce();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("should not throw on circular objects", () => {
    const logger = new AppLogger();
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => {
      logger.log(circular, "TestContext");
      logger.error(circular, "TestContext");
    }).not.toThrow();
  });

  it("should filter out levels disabled via setLogLevels", () => {
    const logger = new AppLogger();
    logger.setLogLevels(["error", "fatal"]);

    logger.debug("hidden", "TestContext");
    logger.log("hidden", "TestContext");

    expect(stdoutSpy).not.toHaveBeenCalled();

    logger.error("visible", "TestContext");

    expect(stderrSpy).toHaveBeenCalledOnce();
  });
});
