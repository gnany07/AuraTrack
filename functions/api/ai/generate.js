// Cloudflare Pages Serverless Edge Function: /api/ai/generate
// Features: Secret API Key Management, Edge IP Rate-Limiting, CORS Origin Lockdown, Payload Capping

// Simple In-Memory Edge IP Rate Limit Cache (Resets automatically per edge isolate execution)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Domain Origin / CORS Lockdown
  const origin = request.headers.get("Origin") || "";
  const referer = request.headers.get("Referer") || "";
  const host = request.headers.get("Host") || "";

  // Allow requests from localhost, Cloudflare Pages domain, or custom domains
  const isAllowedOrigin = origin === "" || 
                          origin.includes("localhost") || 
                          origin.includes("127.0.0.1") || 
                          origin.includes("pages.dev") || 
                          origin.includes(host) ||
                          referer.includes("pages.dev") ||
                          referer.includes("localhost");

  if (!isAllowedOrigin) {
    return new Response(JSON.stringify({ 
      status: "error", 
      message: "Forbidden: Request origin not allowed." 
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 2. Edge IP Rate-Limiting Shield
  const clientIP = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "127.0.0.1";
  const now = Date.now();

  let clientRecord = rateLimitMap.get(clientIP);
  if (!clientRecord || (now - clientRecord.startTime) > RATE_LIMIT_WINDOW_MS) {
    clientRecord = { count: 1, startTime: now };
    rateLimitMap.set(clientIP, clientRecord);
  } else {
    clientRecord.count++;
  }

  if (clientRecord.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - clientRecord.startTime)) / 1000);
    return new Response(JSON.stringify({ 
      status: "error", 
      message: `Rate limit exceeded (DDoS Shield active). Max 5 AI generations per minute. Please try again in ${retryAfter} seconds.` 
    }), {
      status: 429,
      headers: { 
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString()
      }
    });
  }

  // 3. Retrieve Secret GEMINI_API_KEY from Cloudflare Secret Manager
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length < 10) {
    return new Response(JSON.stringify({ 
      status: "error", 
      message: "Cloudflare Environment Configuration Error: Secret GEMINI_API_KEY not configured in Cloudflare Pages settings." 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 4. Payload & Prompt Length Validation
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ status: "error", message: "Invalid JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { prompt, systemInstruction, model: requestedModel } = body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return new Response(JSON.stringify({ status: "error", message: "Prompt string is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Cap prompt length to 4,000 characters to prevent payload bloating attacks
  const sanitizedPrompt = prompt.slice(0, 4000);
  const targetModel = requestedModel || "gemini-2.5-flash";

  // 5. Proxy Request to Google Gemini 2.5 Flash API
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: sanitizedPrompt }] }]
  };

  if (systemInstruction && typeof systemInstruction === "string") {
    payload.systemInstruction = { parts: [{ text: systemInstruction.slice(0, 1000) }] };
  }

  try {
    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const errMsg = data.error?.message || `Gemini API returned status ${geminiRes.status}`;
      return new Response(JSON.stringify({ status: "error", message: errMsg }), {
        status: geminiRes.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      return new Response(JSON.stringify({ status: "error", message: "Empty output received from Gemini API" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ status: "success", result: generatedText }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin || "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: "error", message: `Edge Proxy Error: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
