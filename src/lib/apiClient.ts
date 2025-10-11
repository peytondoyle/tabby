import { API_BASE } from "./apiBase";
import { logServer } from "./errorLogger";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 30000, // 30 seconds overall timeout
  jitterMs: 100
} as const;

// Check if a request should be retried
function shouldRetry(method: HttpMethod, path: string, status?: number): boolean {
  // Only retry specific endpoints
  const retryablePaths = [
    "/api/scan-receipt",
    "/api/scan-receipt?health=1"
  ];
  
  const isRetryablePath = retryablePaths.some(retryPath => path.includes(retryPath));
  if (!isRetryablePath) return false;
  
  // Only retry GET and POST requests
  if (method !== "GET" && method !== "POST") return false;
  
  // Don't retry on 4xx client errors (immediate failure)
  if (status && status >= 400 && status < 500) return false;
  
  return true;
}

// Calculate delay with exponential backoff and jitter
function calculateDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1),
    RETRY_CONFIG.maxDelayMs
  );
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * RETRY_CONFIG.jitterMs;
  
  return Math.floor(exponentialDelay + jitter);
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Health check variables removed - no longer needed

export async function apiFetch<T = any>(
  path: string,
  opts: {
    method?: HttpMethod;
    body?: any;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  } = {}
): Promise<T> {

  const method = opts.method || "GET";
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  
  const startTime = Date.now();
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      // Check if we've exceeded the overall timeout
      if (Date.now() - startTime > RETRY_CONFIG.timeoutMs) {
        throw new Error("Request timeout exceeded");
      }
      
      // Skip probe() call - make request directly
      
      const resp = await fetch(url, {
        method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: opts.signal,
      });
      
      if (!resp.ok) {
        let payload: any = null;
        try { payload = await resp.json(); } catch { /* ignore json parse errors */ }
        const err = new Error(payload?.error || `HTTP_${resp.status}`);
        (err as any).status = resp.status;
        (err as any).payload = payload;
        
        // Check if we should retry this error
        if (attempt < RETRY_CONFIG.maxAttempts && shouldRetry(method, path, resp.status)) {
          const delay = calculateDelay(attempt);
          // Skip logging in dev mode
          if (!import.meta.env.DEV) {
            logServer('warn', 'API request failed, retrying', {
              route: path,
              method,
              attempt,
              status: resp.status,
              delayMs: delay,
              error: err.message
            });
          }

          lastError = err;
          await sleep(delay);
          continue;
        }

        // Log final error (skip in dev mode)
        if (!import.meta.env.DEV) {
          logServer('error', 'API request failed', {
            route: path,
            method,
            attempt,
            status: resp.status,
            error: err.message,
            payload
          });
        }
        
        throw err;
      }
      
      // Success - log if this was a retry (skip in dev mode)
      if (attempt > 1 && !import.meta.env.DEV) {
        logServer('info', 'API request succeeded after retry', {
          route: path,
          method,
          attempt,
          status: resp.status,
          totalTimeMs: Date.now() - startTime
        });
      }
      
      return (await resp.json()) as T;
      
    } catch (error) {
      lastError = error as Error;

      // Don't retry if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        if (!import.meta.env.DEV) {
          logServer('info', 'API request aborted', {
            route: path,
            method,
            attempt
          });
        }
        throw error;
      }

      // Check if we should retry this error
      if (attempt < RETRY_CONFIG.maxAttempts && shouldRetry(method, path)) {
        const delay = calculateDelay(attempt);
        // Don't log in dev mode - we already know API is offline
        if (!import.meta.env.DEV) {
          logServer('warn', 'API request failed, retrying', {
            route: path,
            method,
            attempt,
            error: lastError.message,
            delayMs: delay
          });
        }

        await sleep(delay);
        continue;
      }

      // Log final error (skip in dev mode)
      if (!import.meta.env.DEV) {
        logServer('error', 'API request failed', {
          route: path,
          method,
          attempt,
          error: lastError.message,
          totalTimeMs: Date.now() - startTime
        });
      }

      throw lastError;
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error("Max retry attempts exceeded");
}

export function onApiHealth(cb: (v: boolean) => void) {
  const handler = (e: any) => cb(!!e?.detail?.healthy);
  window.addEventListener("api:health", handler);
  // initial - assume healthy since we removed the probe system
  cb(true);
  return () => window.removeEventListener("api:health", handler);
}

export async function apiUpload<T = any>(
  path: string,
  formData: FormData,
  opts: { signal?: AbortSignal } = {}
): Promise<T> {

  const method = "POST";
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  
  const startTime = Date.now();
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      // Check if we've exceeded the overall timeout
      if (Date.now() - startTime > RETRY_CONFIG.timeoutMs) {
        throw new Error("Request timeout exceeded");
      }
      
      // Skip probe() call - make request directly
      
      // Don't set Content-Type for FormData - let the browser set it with boundary
      const resp = await fetch(url, {
        method,
        body: formData,
        signal: opts.signal,
      });
      
      if (!resp.ok) {
        let payload: any = null;
        try { payload = await resp.json(); } catch { /* ignore json parse errors */ }
        const err = new Error(payload?.error || `HTTP_${resp.status}`);
        (err as any).status = resp.status;
        (err as any).payload = payload;
        
        // Check if we should retry this error
        if (attempt < RETRY_CONFIG.maxAttempts && shouldRetry(method, path, resp.status)) {
          const delay = calculateDelay(attempt);
          if (!import.meta.env.DEV) {
            logServer('warn', 'API upload failed, retrying', {
              route: path,
              method,
              attempt,
              status: resp.status,
              delayMs: delay,
              error: err.message
            });
          }

          lastError = err;
          await sleep(delay);
          continue;
        }

        // Log final error (skip in dev)
        if (!import.meta.env.DEV) {
          logServer('error', 'API upload failed', {
            route: path,
            method,
            attempt,
            status: resp.status,
            error: err.message,
            payload
          });
        }
        
        throw err;
      }
      
      // Success - log if this was a retry (skip in dev)
      if (attempt > 1 && !import.meta.env.DEV) {
        logServer('info', 'API upload succeeded after retry', {
          route: path,
          method,
          attempt,
          status: resp.status,
          totalTimeMs: Date.now() - startTime
        });
      }
      
      return (await resp.json()) as T;
      
    } catch (error) {
      lastError = error as Error;

      // Don't retry if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        if (!import.meta.env.DEV) {
          logServer('info', 'API upload aborted', {
            route: path,
            method,
            attempt
          });
        }
        throw error;
      }

      // Check if we should retry this error
      if (attempt < RETRY_CONFIG.maxAttempts && shouldRetry(method, path)) {
        const delay = calculateDelay(attempt);
        if (!import.meta.env.DEV) {
          logServer('warn', 'API upload failed, retrying', {
            route: path,
            method,
            attempt,
            error: lastError.message,
            delayMs: delay
          });
        }

        await sleep(delay);
        continue;
      }

      // Log final error (skip in dev)
      if (!import.meta.env.DEV) {
        logServer('error', 'API upload failed', {
          route: path,
          method,
          attempt,
          error: lastError.message,
          totalTimeMs: Date.now() - startTime
        });
      }
      
      throw lastError;
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error("Max retry attempts exceeded");
}