import React from "react";

// Componente simple para el MVP (isométrico “fake” con CSS). Luego podemos
// cambiarlo por SVG o Canvas para un look más sólido.
export default function IsometricRoom({ posters=[], mediaShelf=[], playerType="radio", onClickPlayer }) {
  return (
    <section className="iso-wrap">
      {/* Pared izquierda + mueble */}
      <div className="iso-left">
        <div className="furniture">
          <div className="player" role="button" onClick={onClickPlayer} title="Ver Top Songs">
            {playerType === "radio" && <span>📻</span>}
            {playerType === "stereo" && <span>🎚️</span>}
            {playerType === "ipod" && <span>🎵</span>}
          </div>
          <div className="shelf">
            {mediaShelf.slice(0,8).map((m,i)=>(
              <img key={i} src={m.image} alt={m.album} />
            ))}
          </div>
        </div>
      </div>

      {/* Pared derecha con posters */}
      <div className="iso-right">
        <div className="posters">
          {posters.slice(0,15).map((p,i)=>(
            <img key={i} src={p.image} alt={p.name} title={p.name}/>
          ))}
        </div>
      </div>

      {/* Piso */}
      <div className="iso-floor" />
    </section>
  );
}
