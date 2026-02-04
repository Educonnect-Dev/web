import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiGet } from "./api-client";

type FetchInit = { method?: string; headers?: Record<string, string> };

describe("api-client auth headers", () => {
  const authPayload = JSON.stringify({ user: { id: "user-1", role: "teacher" }, accessToken: "token-123" });

  beforeEach(() => {
    const store = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    (globalThis as any).window = { localStorage };
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: null, error: null, meta: {} }),
    }));
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).fetch;
    vi.restoreAllMocks();
  });

  it("injects Authorization header when auth exists", async () => {
    (globalThis as any).window.localStorage.setItem("educonnect_auth", authPayload);

    await apiGet("/sessions");

    const call = (globalThis as any).fetch.mock.calls[0];
    const init = call[1] as FetchInit;
    expect(init?.headers?.Authorization).toBe("Bearer token-123");
  });

  it("does not override explicit headers", async () => {
    (globalThis as any).window.localStorage.setItem("educonnect_auth", authPayload);

    await apiGet("/sessions", { Authorization: "Bearer override-token" });

    const call = (globalThis as any).fetch.mock.calls[0];
    const init = call[1] as FetchInit;
    expect(init?.headers?.Authorization).toBe("Bearer override-token");
  });

  it("does not inject auth headers when no auth", async () => {
    await apiGet("/sessions");

    const call = (globalThis as any).fetch.mock.calls[0];
    const init = call[1] as FetchInit;
    expect(init?.headers?.Authorization).toBeUndefined();
  });
});

describe("api-client refresh flow", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    (globalThis as any).window = { localStorage };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).fetch;
    vi.restoreAllMocks();
  });

  it("refreshes token and retries once on 401", async () => {
    (globalThis as any).window.localStorage.setItem(
      "educonnect_auth",
      JSON.stringify({ accessToken: "expired-token" }),
    );

    (globalThis as any).fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          data: null,
          error: { code: "UNAUTHORIZED", message: "Authentification requise.", traceId: "t1" },
          meta: {},
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: { accessToken: "new-token", refreshToken: "refresh" },
          error: null,
          meta: {},
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: { ok: true },
          error: null,
          meta: {},
        }),
      });

    const response = await apiGet<{ ok: boolean }>("/sessions");

    expect(response.data?.ok).toBe(true);
    const stored = JSON.parse((globalThis as any).window.localStorage.getItem("educonnect_auth"));
    expect(stored.accessToken).toBe("new-token");
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(3);
  });

  it("returns original error when refresh fails", async () => {
    (globalThis as any).window.localStorage.setItem(
      "educonnect_auth",
      JSON.stringify({ accessToken: "expired-token" }),
    );

    (globalThis as any).fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          data: null,
          error: { code: "UNAUTHORIZED", message: "Authentification requise.", traceId: "t1" },
          meta: {},
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          data: null,
          error: { code: "UNAUTHORIZED", message: "Refresh invalide.", traceId: "t2" },
          meta: {},
        }),
      });

    const response = await apiGet("/sessions");
    expect(response.error?.code).toBe("UNAUTHORIZED");
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(2);
  });
});
