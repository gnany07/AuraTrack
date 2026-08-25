// Cloudflare Pages Edge Serverless Function: /api/state
// Multi-Tenant Cloudflare KV Database Persistence for AuraTrack User State (Isolated per User ID)

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Extract User ID from query param or Authorization header or X-User-Id header
  let userId = url.searchParams.get("userId") || request.headers.get("X-User-Id");
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!userId && token) {
    if (token.startsWith("atk_") || token.startsWith("token_")) {
      const parts = token.split("_");
      userId = parts[1] || "default_user";
    }
  }

  userId = userId || "default_user";

  try {
    if (!env.TRACKER_KV) {
      return new Response(JSON.stringify({ 
        status: "info", 
        message: "Cloudflare KV binding (TRACKER_KV) not set up. Using LocalStorage fallback.",
        state: null,
        userId
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const kvKey = `user_state:${userId}`;
    const rawData = await env.TRACKER_KV.get(kvKey);
    const state = rawData ? JSON.parse(rawData) : null;

    return new Response(JSON.stringify({ 
      status: "success", 
      userId,
      state 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: "error", message: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  try {
    const body = await request.json();
    const { state } = body;

    let userId = body.userId || url.searchParams.get("userId") || request.headers.get("X-User-Id");
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!userId && token) {
      if (token.startsWith("atk_") || token.startsWith("token_")) {
        const parts = token.split("_");
        userId = parts[1] || "default_user";
      }
    }

    userId = userId || "default_user";

    if (!state) {
      return new Response(JSON.stringify({ status: "error", message: "State object is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (env.TRACKER_KV) {
      const kvKey = `user_state:${userId}`;
      await env.TRACKER_KV.put(kvKey, JSON.stringify(state));
    }

    return new Response(JSON.stringify({ 
      status: "success", 
      message: `State persisted to Cloudflare KV for user ${userId}`,
      userId
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: "error", message: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
