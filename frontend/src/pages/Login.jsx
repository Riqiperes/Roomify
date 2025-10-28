import React from "react";

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export default function Login() {
  const onConnect = () => window.location.assign(`${BASE}/login`);

  return (
    <main className="screen">
      <h1 className="title">Roomify</h1>
      <p className="subtitle">Tu cuarto según tus stats de Spotify.</p>
      <button className="primary" onClick={onConnect}>Conectar con Spotify</button>
    </main>
  );
}
