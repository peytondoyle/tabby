// api/_utils/cors.ts
import type { IncomingMessage, ServerResponse } from "http";

const ENV_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://tabby-ashen.vercel.app",
  "https://tabby.vercel.app",
  ...ENV_ORIGINS,
]);

export function applyCors(req: IncomingMessage & { method?: string; headers: any }, res: ServerResponse) {
  const origin = (req.headers?.origin as string) || "";

  // Check if origin is in allowed list or matches Vercel deployment patterns
  const isVercelDeployment = origin.includes('.vercel.app') || origin.includes('vercel.app');
  const allowlisted = ALLOWED_ORIGINS.has(origin) || isVercelDeployment;
  const allowOrigin = allowlisted ? origin : origin || "*";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  // Only allow credentials when echoing a specific origin
  res.setHeader("Access-Control-Allow-Credentials", allowlisted ? "true" : "false");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return true;
  }
  return false;
}
