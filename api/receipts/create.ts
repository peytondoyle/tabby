import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors } from "../_utils/cors.js";
import { sendRetiredResponse } from "../_utils/retired.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req as any, res as any)) return;
  return sendRetiredResponse(res);
}
