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
        const response = await fetch("/api/errors/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: batch })
        });
        if (!response.ok) throw new Error(`LOG_FAILED_${response.status}`);
      } catch (e: any) {
        // If API offline, put items back and bail quietly
        if (e?.message === "API_OFFLINE" || e instanceof TypeError) {
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
