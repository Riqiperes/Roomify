import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { URL } from "url";
dotenv.config();

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  SESSION_SECRET
} = process.env;

const app = express();
app.use(express.json());
app.use(cookieParser(SESSION_SECRET));
app.use(cors({
  origin: true, // en dev acepta http://localhost:5173
  credentials: true
}));

const SCOPE = [
  "user-read-email",
  "user-top-read",
  "playlist-read-private"
].join(" ");

const cookieName = "roomify_session"; // guarda access/refresh/exp

function setSession(res, session) {
  res.cookie(cookieName, JSON.stringify(session), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    signed: true,
    path: "/"
  });
}

function getSession(req) {
  const raw = req.signedCookies[cookieName];
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function clearSession(res) {
  res.clearCookie(cookieName, { path: "/" });
}

app.get("/login", (req, res) => {
  const redirect = process.env.SPOTIFY_REDIRECT_URI;
  console.log("Redirect URI (env):", redirect); // <- verifica aquí

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", process.env.SPOTIFY_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirect); // debe ser EXACTAMENTE igual
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("state", Math.random().toString(36).slice(2));

  res.redirect(authUrl.toString());
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("missing code");

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization":
        "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI
    })
  });

  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    return res.status(400).send(t);
  }

  const data = await tokenRes.json();
  const now = Math.floor(Date.now() / 1000);
  setSession(res, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: now + data.expires_in - 30
  });

  res.redirect("http://localhost:5173/room");
});

app.post("/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

async function ensureFreshToken(req, res) {
  let sess = getSession(req);
  if (!sess) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now < sess.expires_at) return sess;

  // refresh
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization":
        "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: sess.refresh_token
    })
  });
  if (!r.ok) return null;
  const d = await r.json();
  sess = {
    access_token: d.access_token,
    refresh_token: d.refresh_token || sess.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + d.expires_in - 30
  };
  setSession(res, sess);
  return sess;
}

app.get("/api/me/top", async (req, res) => {
  const type = req.query.type || "artists"; // artists | tracks
  const term = req.query.term || "medium_term"; // short_term | medium_term | long_term
  const limit = req.query.limit || "20";

  let sess = await ensureFreshToken(req, res);
  if (!sess) return res.status(401).json({ error: "no_session" });

  const r = await fetch(
    `https://api.spotify.com/v1/me/top/${type}?time_range=${term}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${sess.access_token}` } }
  );
  const data = await r.json();
  return res.status(r.status).json(data);
});

app.get("/api/me", async (req, res) => {
  let sess = await ensureFreshToken(req, res);
  if (!sess) return res.status(401).json({ error: "no_session" });
  const r = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${sess.access_token}` }
  });
  res.status(r.status).json(await r.json());
});

const PORT = 4000;
app.listen(PORT, () => console.log("Backend on http://localhost:" + PORT));

export const BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function getTop(type = "artists", term = "medium_term", limit = 20) {
  const url = `${BASE}/api/me/top?type=${encodeURIComponent(type)}&term=${encodeURIComponent(term)}&limit=${encodeURIComponent(limit)}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include", // ← ensure cookies are sent to backend
    headers: { "Accept": "application/json" }
  });
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return res.json();
}
