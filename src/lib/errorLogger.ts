import { apiFetch } from "./apiClient";

type Log = { level: "error" | "warn" | "info"; msg: string; meta?: any };

const queue: Log[] = [];
let flushing = false;

export function logServer(level: Log["level"], msg: string, meta?: any) {
  queue.push({ level, msg, meta });
  void flush();
}

async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    while (queue.length) {
      const batch = queue.splice(0, 10);
      try {
        await apiFetch("/api/errors/log", { method: "POST", body: { logs: batch } });
      } catch (e: any) {
        // If API offline, put items back and bail quietly
        if (e?.message === "API_OFFLINE") {
          queue.unshift(...batch);
          break;
        }
        // Non-offline error: drop batch but keep going
      }
    }
  } finally {
    flushing = false;
  }
}
