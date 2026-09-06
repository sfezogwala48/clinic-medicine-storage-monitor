import { describe, expect, it } from "vite-plus/test";
import { safeCall, safeCallAsync, toError } from "./result.js";

describe("toError", () => {
  it("should pass Error instances through untouched", () => {
    const original = new Error("boom");

    expect(toError(original)).toBe(original);
  });

  it("should convert a thrown string into an Error", () => {
    expect(toError("boom")).toEqual(expect.objectContaining({ message: "boom" }));
  });

  it("should fall back for values JSON cannot serialize", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(toError(circular)).toEqual(expect.objectContaining({ message: "Unknown error thrown" }));
  });
});

describe("safeCall", () => {
  it("should return ok with the value on success", () => {
    const result = safeCall(() => 42);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(42);
  });

  it("should return err with the original Error on throw", () => {
    const original = new Error("boom");
    const result = safeCall((): number => {
      throw original;
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(original);
  });

  it("should normalize a thrown string into an Error", () => {
    const result = safeCall((): number => {
      throw "boom";
    });

    expect(result._unsafeUnwrapErr()).toEqual(expect.objectContaining({ message: "boom" }));
  });
});

describe("safeCallAsync", () => {
  it("should return ok for a resolving promise", async () => {
    const result = await safeCallAsync(async () => "done");

    expect(result._unsafeUnwrap()).toBe("done");
  });

  it("should return err for a rejecting promise", async () => {
    const result = await safeCallAsync(async (): Promise<string> => {
      throw new Error("async boom");
    });

    expect(result._unsafeUnwrapErr()).toEqual(expect.objectContaining({ message: "async boom" }));
  });

  it("should return err when the function throws synchronously", async () => {
    const result = await safeCallAsync((): Promise<string> => {
      throw "sync boom";
    });

    expect(result._unsafeUnwrapErr()).toEqual(expect.objectContaining({ message: "sync boom" }));
  });
});
