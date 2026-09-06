import { Injectable, type LoggerService, type LogLevel } from "@nestjs/common";
import { safeCall } from "../result/result.js";

const LEVEL_ORDER: readonly LogLevel[] = ["verbose", "debug", "log", "warn", "error", "fatal"];

const STDERR_LEVELS: ReadonlySet<LogLevel> = new Set(["warn", "error", "fatal"]);

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  meta?: string[];
}

/** Best-effort serialization: never throws, even on circular input. */
function safeStringify(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  const result = safeCall((): string | undefined => JSON.stringify(value));
  if (result.isErr()) {
    return "[unserializable]";
  }
  return result.value ?? "[unserializable]";
}

function defaultLevel(): LogLevel {
  const fromEnv = process.env.LOG_LEVEL?.toLowerCase();
  if (fromEnv !== undefined && (LEVEL_ORDER as readonly string[]).includes(fromEnv)) {
    return fromEnv as LogLevel;
  }
  return process.env.NODE_ENV === "production" ? "log" : "debug";
}

function useJsonFormat(): boolean {
  const fromEnv = process.env.LOG_FORMAT?.toLowerCase();
  if (fromEnv === "json" || fromEnv === "pretty") {
    return fromEnv === "json";
  }
  return process.env.NODE_ENV === "production";
}

/**
 * Structured application logger.
 *
 * - Pretty, human-readable lines in development (`LOG_FORMAT=pretty`).
 * - Single-line JSON in production (`LOG_FORMAT=json`) for log aggregation.
 * - `warn`/`error`/`fatal` go to stderr, everything else to stdout.
 * - Follows the Nest convention: a trailing string argument is the context.
 */
@Injectable()
export class AppLogger implements LoggerService {
  private enabledLevels: Set<LogLevel>;
  private readonly json: boolean;

  constructor() {
    const minimum = defaultLevel();
    this.enabledLevels = new Set(LEVEL_ORDER.slice(LEVEL_ORDER.indexOf(minimum)));
    this.json = useJsonFormat();
  }

  setLogLevels(levels: LogLevel[]): void {
    this.enabledLevels = new Set(levels);
  }

  isLevelEnabled(level: LogLevel): boolean {
    return this.enabledLevels.has(level);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write("verbose", message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write("debug", message, optionalParams);
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write("log", message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write("warn", message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write("error", message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write("fatal", message, optionalParams);
  }

  private write(level: LogLevel, message: unknown, optionalParams: unknown[]): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }
    const { context, meta } = this.splitContext(optionalParams);
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message: safeStringify(message),
      ...(meta.length > 0 ? { meta: meta.map(safeStringify) } : {}),
    };
    const line = this.json
      ? safeStringify(entry)
      : `[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.context}] ${entry.message}${entry.meta === undefined ? "" : ` ${entry.meta.join(" ")}`}`;
    const stream = STDERR_LEVELS.has(level) ? process.stderr : process.stdout;
    stream.write(`${line}\n`);
  }

  private splitContext(optionalParams: unknown[]): { context: string; meta: unknown[] } {
    const last = optionalParams[optionalParams.length - 1];
    if (optionalParams.length > 0 && typeof last === "string") {
      return { context: last, meta: optionalParams.slice(0, -1) };
    }
    return { context: "App", meta: optionalParams };
  }
}
