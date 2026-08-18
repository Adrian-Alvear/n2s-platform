import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mutate } from "@/lib/db";

// mutate() is the guard that stops Supabase write failures from being swallowed:
// null means the write succeeded, anything else is a message to show the user.
// No real database is involved — a Supabase mutation is just a thenable that
// resolves to { error }.

describe("mutate", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when the mutation succeeds", async () => {
    await expect(mutate(Promise.resolve({ error: null }))).resolves.toBeNull();
  });

  it("returns the message when Supabase reports an error in the result", async () => {
    await expect(
      mutate(Promise.resolve({ error: { message: "duplicate key value" } })),
    ).resolves.toBe("duplicate key value");
  });

  it("returns the message when the mutation throws", async () => {
    await expect(mutate(Promise.reject(new Error("network down")))).resolves.toBe("network down");
  });

  it("returns a generic message when a non-Error value is thrown", async () => {
    await expect(mutate(Promise.reject("just a string"))).resolves.toBe("Something went wrong");
  });

  it("accepts a thenable, which is what a Supabase query builder is", async () => {
    type MutationResult = { error: { message: string } | null };
    const builder: PromiseLike<MutationResult> = {
      then: (onfulfilled, onrejected) =>
        Promise.resolve<MutationResult>({ error: { message: "row not found" } }).then(
          onfulfilled,
          onrejected,
        ),
    };
    await expect(mutate(builder)).resolves.toBe("row not found");
  });

  it("logs a failed result before returning it", async () => {
    await mutate(Promise.resolve({ error: { message: "boom" } }));
    expect(console.error).toHaveBeenCalledWith("[db] mutation failed:", "boom");
  });

  it("logs a thrown error before returning it", async () => {
    await mutate(Promise.reject(new Error("offline")));
    expect(console.error).toHaveBeenCalledWith("[db] mutation threw:", "offline");
  });

  it("returns an empty string — not null — for an error with a blank message", async () => {
    // Quirk: the result is non-null (so the write did fail) but falsy, so a
    // caller written as `if (msg) showError(msg)` silently treats it as success.
    const result = await mutate(Promise.resolve({ error: { message: "" } }));
    expect(result).toBe("");
    expect(result).not.toBeNull();
  });
});
