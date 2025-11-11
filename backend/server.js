import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const {
  PORT = 8080,
  SESSION_SECRET = "dev",
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  FRONTEND_URL = "http://127.0.0.1:5173",
  SCOPES = "user-read-email user-top-read"
} = process.env;

// Allow both localhost and 127.0.0.1 for CORS
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
  console.error("❌ Falta configurar .env");
  process.exit(1);
}

const app = express();
app.use(cookieParser(SESSION_SECRET));
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

const COOKIE = "roomify_auth";

// Helpers
function setSession(res, data) {
  res.cookie(COOKIE, JSON.stringify(data), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}
function getSession(req) {
  try { return JSON.parse(req.cookies[COOKIE] || "null"); } catch { return null; }
}
function clearSession(res) {
  res.clearCookie(COOKIE);
}

async function refreshIfNeeded(req, res) {
  const sess = getSession(req);
  if (!sess) throw new Error("no_session");
  const now = Math.floor(Date.now() / 1000);
  if (now < sess.expires_at - 10) return sess; // still valid

  // refresh
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: sess.refresh_token,
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET
    })
  });
  if (!tokenRes.ok) throw new Error("refresh_failed");
  const data = await tokenRes.json();
  const updated = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || sess.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in
  };
  setSession(res, updated);
  return updated;
}

// SINGLE OAuth start: set state cookie and redirect to Spotify authorize
app.get("/login", (req, res) => {
  const state = crypto.randomBytes(8).toString("hex");
  res.cookie("oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/" });
  console.log(`[login] set oauth_state=${state}`);

  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", SPOTIFY_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", SPOTIFY_REDIRECT_URI);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);

  console.log(`[login] redirecting to Spotify -> ${url.toString()}`);
  res.redirect(url.toString());
});

// SINGLE OAuth callback: validate state, exchange code, set session cookie, redirect to frontend
app.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  const cookieState = req.cookies["oauth_state"];
  console.log(`[callback] code=${String(code || "").slice(0,8)} state=${state} cookieState=${cookieState}`);

  if (!code || !state) {
    return res.status(400).send("Missing code/state");
  }
  if (!cookieState || state !== cookieState) {
    console.error("[callback] invalid state - possible missing oauth_state cookie or mismatch");
    return res.status(400).send(`Invalid state. Try logging in again: <a href="${FRONTEND_URL}/">${FRONTEND_URL}</a>`);
  }

  try {
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET
      })
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("[callback] token exchange failed:", t);
      return res.status(400).send("Token exchange failed: " + t);
    }

    const data = await r.json();
    setSession(res, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in
    });

    // clear state cookie and redirect to frontend root (frontend will call /api/me)
    res.clearCookie("oauth_state", { path: "/" });
    return res.redirect(FRONTEND_URL);
  } catch (err) {
    console.error("[callback] error", err);
    return res.status(500).send("Server error");
  }
});

app.post("/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

// API endpoints (unchanged)
app.get("/api/me", async (req, res) => {
  try {
    const sess = await refreshIfNeeded(req, res);
    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${sess.access_token}` }
    }).then(r => r.json());
    res.json(me);
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
});

app.get("/api/top-artists", async (req, res) => {
  const limit = String(req.query.limit || "10");
  const term = String(req.query.term || "medium_term");
  try {
    const sess = await refreshIfNeeded(req, res);
    const data = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=${limit}&time_range=${term}`, {
      headers: { Authorization: `Bearer ${sess.access_token}` }
    }).then(r => r.json());
    res.json(data);
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
});

app.get("/api/top-tracks", async (req, res) => {
  const limit = String(req.query.limit || "10");
  const term = String(req.query.term || "medium_term");
  try {
    const sess = await refreshIfNeeded(req, res);
    const data = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=${term}`, {
      headers: { Authorization: `Bearer ${sess.access_token}` }
    }).then(r => r.json());
    res.json(data);
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
});

app.get("/api/saved-albums", async (req, res) => {
  const limit = String(req.query.limit || "10");
  try {
    const sess = await refreshIfNeeded(req, res);
    const data = await fetch(`https://api.spotify.com/v1/me/albums?limit=${limit}`, {
      headers: { Authorization: `Bearer ${sess.access_token}` }
    }).then(r => r.json());
    res.json(data);
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
});

app.get("/api/multiple-artists", async (req, res) => {
  const ids = String(req.query.ids || "");
  if (!ids) return res.status(400).json({ error: "missing ids" });
  try {
    const sess = await refreshIfNeeded(req, res);
    const data = await fetch(`https://api.spotify.com/v1/artists?ids=${encodeURIComponent(ids)}` , {
      headers: { Authorization: `Bearer ${sess.access_token}` }
    }).then(r => r.json());
    res.json(data);
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
});

app.get("/api/multiple-tracks", async (req, res) => {
  const ids = String(req.query.ids || "");
  if (!ids) return res.status(400).json({ error: "missing ids" });
  try {
    const sess = await refreshIfNeeded(req, res);
    const data = await fetch(`https://api.spotify.com/v1/tracks?ids=${encodeURIComponent(ids)}` , {
      headers: { Authorization: `Bearer ${sess.access_token}` }
    }).then(r => r.json());
    res.json(data);
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
});

app.get("/api/multiple-albums", async (req, res) => {
  const ids = String(req.query.ids || "");
  if (!ids) return res.status(400).json({ error: "missing ids" });
  try {
    const sess = await refreshIfNeeded(req, res);
    const data = await fetch(`https://api.spotify.com/v1/albums?ids=${encodeURIComponent(ids)}` , {
      headers: { Authorization: `Bearer ${sess.access_token}` }
    }).then(r => r.json());
    res.json(data);
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend on http://127.0.0.1:${PORT}`);
});
