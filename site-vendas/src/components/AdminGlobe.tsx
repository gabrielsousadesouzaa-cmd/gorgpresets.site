import React, { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { useSpring } from 'react-spring';

const CITY_COORDS: Record<string, [number, number]> = {
  "São Paulo": [-23.5505, -46.6333],
  "Rio de Janeiro": [-22.9068, -43.1729],
  "Belo Horizonte": [-19.9208, -43.9378],
  "Brasília": [-15.7938, -47.8828],
  "Curitiba": [-25.4284, -49.2733],
  "Porto Alegre": [-30.0346, -51.2177],
  "Salvador": [-12.9714, -38.5014],
  "Fortaleza": [-3.7172, -38.5433],
  "Recife": [-8.0476, -34.8770],
  "Goiânia": [-16.6869, -49.2648],
  "Manaus": [-3.1190, -60.0217],
  "Belém": [-1.4550, -48.5024],
  "Vitória": [-20.3155, -40.3128],
  "Florianópolis": [-27.5954, -48.5480],
  "Lisboa": [38.7223, -9.1393],
  "Porto": [41.1579, -8.6291],
  "Luanda": [-8.8390, 13.2894],
  "Miami": [25.7617, -80.1918],
  "Orlando": [28.5383, -81.3792]
};

// Faz um fallback para lugares desconhecidos espalhados pelo Brasil
const getRandomCoordInBrazil = (): [number, number] => {
  const lat = -23.5 + (Math.random() * 15);
  const lon = -46.6 + (Math.random() * 15 - 7.5);
  return [lat, lon];
};

export function AdminGlobe({ cities }: { cities: Array<[string, number]> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  
  const [{ r }, api] = useSpring(() => ({
    r: 0,
    config: {
      mass: 1,
      tension: 280,
      friction: 40,
      precision: 0.001,
    },
  }));

  useEffect(() => {
    let phi = 0;
    if (!canvasRef.current) return;

    // Constrói os markers com base nas cidades ativas
    // Tamanho do marcador é baseado no número de visitantes, máx de 0.1
    const highestCount = cities.length > 0 ? cities[0][1] : 1;
    const markers = cities.map(([city, count]) => {
      const coord = CITY_COORDS[city] || getRandomCoordInBrazil();
      const relativeSize = Math.max(0.04, (count / highestCount) * 0.1);
      return { location: coord, size: relativeSize };
    });

    if (markers.length === 0) {
      markers.push({ location: [-23.5505, -46.6333], size: 0.05 }); // SP como base
    }

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0.2,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 24000,
      mapBrightness: 6,
      baseColor: [0.05, 0.05, 0.1], // Fundo noturno estiloso
      markerColor: [1, 0.1, 0.1],   // Ícone Vermelho (como pedido)
      glowColor: [0.05, 0.05, 0.12], // Brilho levemente roxo/azul escuro
      markers: markers,
      onRender: (state) => {
        // Rotação automática suave
        if (!pointerInteracting.current) {
          phi += 0.003;
        }
        state.phi = phi + r.get();
        state.width = 600 * 2;
        state.height = 600 * 2;
      },
    });

    return () => globe.destroy();
  }, [cities]); // Recria o globo quando as cidades atualizarem

  return (
    <div style={{
      width: '100%',
      maxWidth: 600,
      aspectRatio: 1,
      margin: 'auto',
      position: 'relative',
      cursor: 'grab'
    }}>
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current =
            e.clientX - pointerInteractionMovement.current;
          canvasRef.current!.style.cursor = 'grabbing';
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          canvasRef.current!.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          canvasRef.current!.style.cursor = 'grab';
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            api.start({ r: delta / 200 });
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            api.start({ r: delta / 100 });
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          contain: 'layout paint size',
          opacity: 1,
          transition: 'opacity 1s ease',
        }}
      />
    </div>
  );
}
