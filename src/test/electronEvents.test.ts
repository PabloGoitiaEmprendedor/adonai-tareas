import { describe, expect, it, vi } from "vitest";
import { subscribeElectronEvent } from "@/lib/electronEvents";

describe("electronEvents", () => {
  it("returns a no-op unsubscribe when no register function exists", () => {
    const unsubscribe = subscribeElectronEvent(undefined, vi.fn());
    expect(() => unsubscribe()).not.toThrow();
  });

  it("passes the callback to the register function and reuses its unsubscribe", () => {
    const callback = vi.fn();
    const unregister = vi.fn();
    const register = vi.fn().mockReturnValue(unregister);

    const unsubscribe = subscribeElectronEvent(register, callback);

    expect(register).toHaveBeenCalledWith(callback);
    unsubscribe();
    expect(unregister).toHaveBeenCalledTimes(1);
  });
});
