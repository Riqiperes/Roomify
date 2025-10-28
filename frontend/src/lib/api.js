const BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export async function getTop(type="artists", term="medium_term", limit=20) {
  const r = await fetch(`${BASE}/api/me/top?type=${type}&term=${term}&limit=${limit}`, {
    credentials: "include"
  });
  if (!r.ok) throw new Error("auth_required");
  return r.json();
}

export async function getMe() {
  const r = await fetch(`${BASE}/api/me`, { credentials: "include" });
  if (!r.ok) throw new Error("auth_required");
  return r.json();
}
