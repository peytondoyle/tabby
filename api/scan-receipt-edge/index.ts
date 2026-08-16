export const config = {
  runtime: "edge",
  regions: ["iad1", "sfo1", "lhr1", "syd1"],
};

const retiredBody = JSON.stringify({
  ok: false,
  error: "Tabby has been retired.",
  code: "APP_RETIRED",
});

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "http://localhost:5173";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export default async function handler(req: Request) {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(retiredBody, {
    status: 410,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}
