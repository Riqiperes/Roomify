import React, { useEffect, useState } from "react";
import { getTop } from "../lib/api";
import IsometricRoom from "../components/IsometricRoom";

export default function Room({ navigate }) {
  const [artists, setArtists] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [a, t] = await Promise.all([
          getTop("artists", "medium_term", 50),
          getTop("tracks", "medium_term", 30)
        ]);
        if (ignore) return;
        setArtists(a.items || []);
        setTracks(t.items || []);
      } catch (e) {
        window.location.href = "/";
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  if (loading) return <div className="screen">Cargando…</div>;

  const posters = artists.slice(0, 15).map(x => ({
    name: x.name, image: (x.images?.[1]?.url || x.images?.[0]?.url)
  }));
  const media = tracks.slice(0, 12).map(t => ({
    album: t.album?.name,
    image: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url
  }));

  return (
    <main className="room">
      <header className="room-top">
        <h2>Mi Room</h2>
        <nav>
          <button onClick={() => navigate("/top-tracks")}>Top Songs</button>
        </nav>
      </header>

      <IsometricRoom
        posters={posters}                // pared derecha: top artists (10/15/50)
        mediaShelf={media}               // mueble izquierdo: viniles/cds/cassettes
        playerType="radio"               // “radio | stereo | ipod” (luego elegible)
        onClickPlayer={() => navigate("/top-tracks")}
      />
    </main>
  );
}
