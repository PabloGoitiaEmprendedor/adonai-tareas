import { beforeEach, describe, expect, it } from "vitest";
import { clearAdonaiStorage, isAdonaiStorageKey } from "@/lib/appStorage";

describe("appStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("detects Adonai-managed storage keys", () => {
    expect(isAdonaiStorageKey("adonai_theme")).toBe(true);
    expect(isAdonaiStorageKey("adonai:selected-date")).toBe(true);
    expect(isAdonaiStorageKey("sb-auth-token")).toBe(true);
    expect(isAdonaiStorageKey("third_party_pref")).toBe(false);
  });

  it("clears only Adonai-managed storage keys", () => {
    window.localStorage.setItem("adonai_theme", "dark");
    window.localStorage.setItem("adonai:selected-date", "2026-06-01");
    window.localStorage.setItem("sb-test-token", "session");
    window.localStorage.setItem("keep_me", "1");

    clearAdonaiStorage(window.localStorage);

    expect(window.localStorage.getItem("adonai_theme")).toBeNull();
    expect(window.localStorage.getItem("adonai:selected-date")).toBeNull();
    expect(window.localStorage.getItem("sb-test-token")).toBeNull();
    expect(window.localStorage.getItem("keep_me")).toBe("1");
  });
});
