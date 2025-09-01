import { API_BASE } from "./apiBase";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

let healthy = false;
let nextProbeAt = 0;
let backoffMs = 500; // doubles up to 10s

async function probe(): Promise<boolean> {
  const now = Date.now();
  if (now < nextProbeAt) return healthy;
  try {
    const u = `${API_BASE}/api/scan-receipt?health=1`;
    const r = await fetch(u, { method: "GET", cache: "no-store" });
    healthy = r.ok;
  } catch {
    healthy = false;
  }
  // backoff scheduling
  if (!healthy) {
    nextProbeAt = now + backoffMs;
    backoffMs = Math.min(backoffMs * 2, 10_000);
  } else {
    backoffMs = 500;
    nextProbeAt = now + 5_000; // probe again later
  }
  // broadcast status
  window.dispatchEvent(new CustomEvent("api:health", { detail: { healthy } }));
  return healthy;
}

export async function apiFetch<T = any>(
  path: string,
  opts: { method?: HttpMethod; body?: any; headers?: Record<string, string> } = {}
): Promise<T> {
  const ok = await probe();
  if (!ok) {
    throw new Error("API_OFFLINE");
  }
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  const resp = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!resp.ok) {
    let payload: any = null;
    try { payload = await resp.json(); } catch {}
    const err = new Error(payload?.error || `HTTP_${resp.status}`);
    (err as any).status = resp.status;
    (err as any).payload = payload;
    throw err;
  }
  return (await resp.json()) as T;
}

export function onApiHealth(cb: (v: boolean) => void) {
  const handler = (e: any) => cb(!!e?.detail?.healthy);
  window.addEventListener("api:health", handler);
  // initial
  cb(healthy);
  return () => window.removeEventListener("api:health", handler);
}

export async function apiUpload<T = any>(
  path: string,
  formData: FormData
): Promise<T> {
  const ok = await probe();
  if (!ok) {
    throw new Error("API_OFFLINE");
  }
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  
  // Don't set Content-Type for FormData - let the browser set it with boundary
  const resp = await fetch(url, {
    method: "POST",
    body: formData,
  });
  
  if (!resp.ok) {
    let payload: any = null;
    try { payload = await resp.json(); } catch {}
    const err = new Error(payload?.error || `HTTP_${resp.status}`);
    (err as any).status = resp.status;
    (err as any).payload = payload;
    throw err;
  }
  
  return (await resp.json()) as T;
}