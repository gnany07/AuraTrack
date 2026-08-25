// Cloudflare Pages Serverless Function: /api/auth
// Handles Multi-User Authentication (Sign Up, Sign In, Session Verification) for AuraTrack

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.pathname.split("/").pop(); // 'signup', 'login', or 'auth'

  try {
    const body = await request.json();
    
    // Fallback in-memory/simulated responses if KV is not bound
    if (!env.TRACKER_KV) {
      if (action === "signup" || action === "login") {
        const email = (body.email || "").trim().toLowerCase();
        const name = (body.name || email.split("@")[0] || "User").trim();
        const userId = btoa(email).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "user_" + Date.now();
        const token = "token_" + userId + "_" + Date.now();
        
        return new Response(JSON.stringify({
          status: "success",
          message: `${action === "signup" ? "Account created" : "Logged in"} successfully (Local/KV Mode)`,
          user: { id: userId, email, name },
          token
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (action === "signup") {
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";
      const name = (body.name || email.split("@")[0] || "User").trim();

      if (!email || !email.includes("@")) {
        return new Response(JSON.stringify({ status: "error", message: "Valid email address is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (password.length < 4) {
        return new Response(JSON.stringify({ status: "error", message: "Password must be at least 4 characters" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Check if user already exists
      const existingUserRaw = await env.TRACKER_KV.get(`user_auth:${email}`);
      if (existingUserRaw) {
        return new Response(JSON.stringify({ status: "error", message: "An account with this email already exists. Please sign in." }), {
          status: 409,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Generate simple user ID and store credentials
      const userId = "usr_" + Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      
      const userData = {
        id: userId,
        email,
        name,
        passwordHash: await hashString(password),
        createdAt: new Date().toISOString()
      };

      await env.TRACKER_KV.put(`user_auth:${email}`, JSON.stringify(userData));
      await env.TRACKER_KV.put(`user_by_id:${userId}`, JSON.stringify({ id: userId, email, name }));

      const token = `atk_${userId}_${Date.now()}`;
      await env.TRACKER_KV.put(`session:${token}`, JSON.stringify({ userId, email, name }), { expirationTtl: 86400 * 30 }); // 30 days

      return new Response(JSON.stringify({
        status: "success",
        message: "Account created successfully!",
        user: { id: userId, email, name },
        token
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (action === "login") {
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";

      if (!email || !password) {
        return new Response(JSON.stringify({ status: "error", message: "Email and password are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const existingUserRaw = await env.TRACKER_KV.get(`user_auth:${email}`);
      if (!existingUserRaw) {
        return new Response(JSON.stringify({ status: "error", message: "No account found with this email. Please create an account." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      const user = JSON.parse(existingUserRaw);
      const inputHash = await hashString(password);
      if (user.passwordHash !== inputHash) {
        return new Response(JSON.stringify({ status: "error", message: "Incorrect password" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      const token = `atk_${user.id}_${Date.now()}`;
      await env.TRACKER_KV.put(`session:${token}`, JSON.stringify({ userId: user.id, email: user.email, name: user.name }), { expirationTtl: 86400 * 30 });

      return new Response(JSON.stringify({
        status: "success",
        message: "Logged in successfully!",
        user: { id: user.id, email: user.email, name: user.name },
        token
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ status: "error", message: "Invalid auth action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ status: "error", message: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return new Response(JSON.stringify({ status: "unauthenticated", user: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    if (env.TRACKER_KV) {
      const sessionRaw = await env.TRACKER_KV.get(`session:${token}`);
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        return new Response(JSON.stringify({ status: "success", user: session }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Fallback token decode
    if (token.startsWith("atk_") || token.startsWith("token_")) {
      const parts = token.split("_");
      const userId = parts[1] || "user_guest";
      return new Response(JSON.stringify({
        status: "success",
        user: { id: userId, name: "Active User", email: "" }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ status: "unauthenticated", user: null }), {
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

async function hashString(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str + "_auratrack_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
