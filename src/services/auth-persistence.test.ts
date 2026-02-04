import { afterEach, describe, expect, it, vi } from "vitest";

import { restoreSession } from "./auth-persistence";

describe("restoreSession", () => {
  const storage: Record<string, string> = {};

  afterEach(() => {
    vi.restoreAllMocks();
    Object.keys(storage).forEach((key) => delete storage[key]);
  });

  it("hydrates auth storage after refresh success", async () => {
    storage.educonnect_auth = JSON.stringify({ user: { id: "u1", email: "a@b.com", role: "student" } });
    const localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    };
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", { localStorage } as any);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: { accessToken: "new-token", refreshToken: "r" }, error: null, meta: {} }),
      })) as any,
    );

    const restored = await restoreSession();
    expect(restored).toBe(true);
    expect(storage.educonnect_auth).toContain("new-token");
  });

  it("clears auth storage on refresh failure", async () => {
    storage.educonnect_auth = JSON.stringify({ user: { id: "u1", email: "a@b.com", role: "student" } });
    const localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    };
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", { localStorage } as any);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ data: null, error: { code: "UNAUTHORIZED" }, meta: {} }),
      })) as any,
    );

    const restored = await restoreSession();
    expect(restored).toBe(false);
    expect(storage.educonnect_auth).toBeUndefined();
  });

  it("skips refresh when no stored auth", async () => {
    const localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    };
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", { localStorage } as any);
    vi.stubGlobal("fetch", vi.fn());

    const restored = await restoreSession();
    expect(restored).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
