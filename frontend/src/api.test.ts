import { afterEach, describe, it, expect, vi } from "vitest";
import { api, ApiError, login, tokenActive } from "./api";
afterEach(() => vi.unstubAllGlobals());
describe("API session boundaries", () => {
  it("uses session CSRF for login and refreshes it after authentication", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ token: "before", headerName: "X-CSRF-TOKEN" }),
        ),
      )
      .mockResolvedValueOnce(new Response('{"ok":true}'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ token: "after", headerName: "X-CSRF-TOKEN" }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ email: "admin@example.com", name: "Admin" }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    await login("admin@example.com", "password");
    const options = fetchMock.mock.calls[1][1];
    expect(options.headers.get("X-CSRF-TOKEN")).toBe("before");
    expect(options.credentials).toBe("same-origin");
    expect(fetchMock.mock.calls[2][0]).toBe("/api/auth/csrf");
  });
  it("preserves server revision conflicts for reconciliation", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              code: "REVISION_CONFLICT",
              message: "Reload context",
            }),
            { status: 409 },
          ),
        ),
    );
    await expect(api("/projects")).rejects.toMatchObject({
      status: 409,
      code: "REVISION_CONFLICT",
      message: "Reload context",
    } satisfies Partial<ApiError>);
  });
  it("does not treat revoked or expired credentials as active", () => {
    const base = {
      id: "1",
      projectId: "p",
      name: "a",
      prefix: "cb_",
      permission: "WRITE" as const,
      expiresAt: "2099-01-01",
      revokedAt: null,
      lastUsedAt: null,
      createdAt: "2026-01-01",
    };
    expect(tokenActive(base)).toBe(true);
    expect(tokenActive({ ...base, revokedAt: "2026-01-02" })).toBe(false);
    expect(tokenActive({ ...base, expiresAt: "2020-01-01" })).toBe(false);
  });
});
