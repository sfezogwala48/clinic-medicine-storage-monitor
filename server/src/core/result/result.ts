import { ResultAsync, err, ok } from "neverthrow";
import type { Result } from "neverthrow";

export type { Result, ResultAsync };
export { err, ok };

/**
 * Normalize anything thrown into an {@link Error}.
 *
 * `throw` accepts any value, so boundary code must not assume `Error`.
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  try {
    return new Error(`Non-error thrown: ${JSON.stringify(error)}`);
  } catch {
    return new Error("Unknown error thrown");
  }
}

/**
 * Call a sync function safely, capturing throws into a {@link Result}.
 *
 * Prefer this at I/O and parsing boundaries (JSON, env, fs, sqlite)
 * instead of leaving raw `try/catch` blocks scattered around.
 */
export function safeCall<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return err(toError(error));
  }
}

/**
 * Call an async (or sync) function safely, capturing both sync throws
 * and rejections into a {@link ResultAsync}.
 */
export function safeCallAsync<T>(fn: () => Promise<T> | T): ResultAsync<T, Error> {
  return new ResultAsync(
    (async (): Promise<Result<T, Error>> => {
      try {
        return ok(await fn());
      } catch (error) {
        return err(toError(error));
      }
    })(),
  );
}
