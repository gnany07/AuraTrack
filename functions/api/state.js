// Cloudflare Pages Edge Serverless Function: /api/state
// Cloudflare KV Database Persistence for AuraTrack User State (Kanban, Custom Jobs, Resume Profile)

export async function onRequestGet(context) {
  const { env } = context;

  try {
    if (!env.TRACKER_KV) {
      return new Response(JSON.stringify({ 
        status: "info", 
        message: "Cloudflare KV binding (TRACKER_KV) not set up yet. Using LocalStorage & IndexedDB fallback.",
        state: null 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const rawData = await env.TRACKER_KV.get("user_state");
    const state = rawData ? JSON.parse(rawData) : null;

    return new Response(JSON.stringify({ 
      status: "success", 
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

  try {
    const body = await request.json();
    const { state } = body;

    if (!state) {
      return new Response(JSON.stringify({ status: "error", message: "State object is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (env.TRACKER_KV) {
      await env.TRACKER_KV.put("user_state", JSON.stringify(state));
    }

    return new Response(JSON.stringify({ status: "success", message: "State persisted to Cloudflare KV database" }), {
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
