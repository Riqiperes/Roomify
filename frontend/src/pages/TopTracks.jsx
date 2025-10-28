import React, { useEffect, useState } from "react";
import { getTop } from "../lib/api";

export default function TopTracks({ navigate }) {
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    getTop("tracks", "long_term", 50).then(d => setTracks(d.items || [])).catch(() => window.location.href="/");
  }, []);

  return (
    <main className="screen scroll">
      <header style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h2>Top Tracks</h2>
        <button onClick={() => navigate("/room")}>Volver</button>
      </header>
      <div className="grid">
        {tracks.map((t,i)=>(
          <div className="card" key={i}>
            <img src={t.album?.images?.[1]?.url || ""} alt="" />
            <div>
              <strong>{t.name}</strong>
              <div className="muted">{t.artists?.map(a=>a.name).join(", ")}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
