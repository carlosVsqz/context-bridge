export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  repositoryUrl: string;
  summary: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export type Entry = {
  id: string;
  projectId: string;
  kind: "CHECKPOINT" | "DECISION" | "NOTE";
  title: string;
  content: string;
  environment: string;
  branch: string;
  gitCommit: string;
  author: string;
  revision: number;
  createdAt: string;
};
export type Token = {
  id: string;
  projectId: string;
  name: string;
  prefix: string;
  permission: "READ" | "WRITE";
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};
export type Context = {
  project: Project;
  entries: Entry[];
  nextCursor: string | null;
};
export type User = { email: string; name: string };
let csrf: { token: string; headerName: string } | null = null;
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function refreshCsrf() {
  const res = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  if (!res.ok) throw new Error("No se pudo conectar con el servidor.");
  csrf = await res.json();
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method ?? "GET";
  if (method !== "GET" && !csrf) await refreshCsrf();
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof URLSearchParams))
    headers.set("Content-Type", "application/json");
  if (method !== "GET" && csrf) headers.set(csrf.headerName, csrf.token);
  const res = await fetch("/api" + path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    if (res.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      res.status,
      error.code ?? "REQUEST_FAILED",
      error.message ??
        (res.status === 403
          ? "La sesión cambió. Recarga la página e inténtalo nuevamente."
          : "No se pudo completar la operación."),
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
export async function login(email: string, password: string) {
  await refreshCsrf();
  await api("/auth/login", {
    method: "POST",
    body: new URLSearchParams({ email, password }),
  });
  await refreshCsrf();
  return api<User>("/auth/me");
}
export async function logout() {
  await api("/auth/logout", { method: "POST" });
  csrf = null;
}
export const json = (value: unknown) => JSON.stringify(value);
export const tokenActive = (t: Token) =>
  !t.revokedAt && new Date(t.expiresAt).getTime() > Date.now();

export function newRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
