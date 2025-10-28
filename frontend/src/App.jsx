import React, { useState, useEffect } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

export default function App() {
  const [me, setMe] = useState(null);
  const [items, setItems] = useState([]);
  const [type, setType] = useState("artists"); // artists | tracks | albums
  const [limit, setLimit] = useState(15);
  const [term, setTerm] = useState("medium_term");

  async function loadMe() {
    const r = await fetch(`${BACKEND}/api/me`, { credentials: "include" });
    if (r.ok) setMe(await r.json());
  }
  async function loadTop(selectedType = type) {
    let url;
    if (selectedType === "artists") url = `${BACKEND}/api/top-artists?limit=${limit}&term=${term}`;
    else if (selectedType === "tracks") url = `${BACKEND}/api/top-tracks?limit=${limit}&term=${term}`;
    else if (selectedType === "albums") url = `${BACKEND}/api/saved-albums?limit=${limit}`;

    const r = await fetch(url, { credentials: "include" });
    if (r.ok) {
      const json = await r.json();
      // artists and tracks return { items: [...] }, saved albums returns { items: [{ album: {...} }, ...] }
      let list = json.items || [];
      if (selectedType === "albums") {
        list = list.map(i => i.album || i);
      }
      setItems(list);
    } else {
      alert("Inicia sesión primero.");
    }
  }

  // Check session on mount so the UI reflects login state after redirect
  useEffect(() => {
    loadMe();
  }, []);

  return (
    <div style={{padding:24}}>
      <h1>Roomify – Demo mínima</h1>
      <p>1) <a href={`${BACKEND}/login`}>Conectar con Spotify</a></p>
      <div style={{marginTop:12}}>
        <button onClick={loadMe}>Ver /api/me</button>
      </div>

      <div style={{marginTop:12, display:"flex", gap:8, alignItems:"center"}}>
        <label>Show:</label>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="artists">Top Artists</option>
          <option value="tracks">Top Tracks</option>
          <option value="albums">Saved Albums</option>
        </select>
        <label>Time range:</label>
        <select value={term} onChange={e => setTerm(e.target.value)} disabled={type === 'albums'}>
          <option value="short_term">Last 4 weeks</option>
          <option value="medium_term">6 months</option>
          <option value="long_term">All time</option>
        </select>
        <label>Limit:</label>
        <input type="number" value={limit} min={1} max={50} onChange={e => setLimit(Number(e.target.value))} style={{width:60}} />
        <button onClick={() => loadTop(type)}>Load</button>
      </div>

      {me && (
        <div style={{marginTop:16}}>
          <b>Usuario:</b> {me.display_name} ({me.email})
        </div>
      )}

      <ul style={{marginTop:16, display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:12, listStyle:"none", padding:0}}>
        {items.map((it, idx) => {
          if (type === "artists") return (
            <li key={it.id || idx} style={{background:"#15151b", padding:12, borderRadius:12}}>
              <img src={(it.images?.[1]?.url || it.images?.[0]?.url)} alt={it.name} style={{width:"100%", height:160, objectFit:"cover", borderRadius:8}}/>
              <div style={{marginTop:8, fontWeight:700}}>{it.name}</div>
              <div style={{opacity:.7, fontSize:12}}>Followers: {it.followers?.total?.toLocaleString?.() ?? "-"}</div>
            </li>
          );

          if (type === "tracks") return (
            <li key={it.id || idx} style={{background:"#15151b", padding:12, borderRadius:12}}>
              <img src={(it.album?.images?.[1]?.url || it.album?.images?.[0]?.url)} alt={it.name} style={{width:"100%", height:160, objectFit:"cover", borderRadius:8}}/>
              <div style={{marginTop:8, fontWeight:700}}>{it.name}</div>
              <div style={{opacity:.7, fontSize:12}}>{(it.artists || []).map(a=>a.name).join(", ")}</div>
            </li>
          );

          // albums
          return (
            <li key={it.id || idx} style={{background:"#15151b", padding:12, borderRadius:12}}>
              <img src={(it.images?.[1]?.url || it.images?.[0]?.url)} alt={it.name} style={{width:"100%", height:160, objectFit:"cover", borderRadius:8}}/>
              <div style={{marginTop:8, fontWeight:700}}>{it.name}</div>
              <div style={{opacity:.7, fontSize:12}}>{(it.artists || []).map(a=>a.name).join(", ")}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
