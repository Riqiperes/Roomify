import React, { useEffect, useState } from "react";
import Login from "./pages/Login.jsx";
import Room from "./pages/Room.jsx";
import TopTracks from "./pages/TopTracks.jsx";

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onNav = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  const navigate = (to) => { window.history.pushState({}, "", to); setRoute(to); };

  if (route === "/room") return <Room navigate={navigate} />;
  if (route === "/top-tracks") return <TopTracks navigate={navigate} />;
  return <Login navigate={navigate} />;
}
