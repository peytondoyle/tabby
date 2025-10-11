import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const must = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "NEXT_PUBLIC_R2_PUBLIC_BASE",
  ];
  const missing = must.filter((k) => !process.env[k]);
  res.status(200).json({
    env: process.env.VERCEL_ENV,
    ok: missing.length === 0,
    missing,
  });
}
