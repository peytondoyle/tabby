import type { VercelResponse } from '@vercel/node';

export function sendRetiredResponse(res: VercelResponse) {
  return res.status(410).json({
    ok: false,
    error: 'Tabby has been retired.',
    code: 'APP_RETIRED'
  });
}
