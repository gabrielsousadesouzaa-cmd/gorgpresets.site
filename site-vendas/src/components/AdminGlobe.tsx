import React, { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

// Coordenadas das principais cidades
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

const getRandomCoordInBrazil = (): [number, number] => {
  const lat = -23.5 + (Math.random() * 15);
  const lon = -46.6 + (Math.random() * 15 - 7.5);
  return [lat, lon];
};

export function AdminGlobe({ cities }: { cities: Array<[string, number]> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Interações de Mouse
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const currentPhi = useRef(0);

  useEffect(() => {
    let phi = 0;
    if (!canvasRef.current) return;

    const highestCount = cities.length > 0 ? cities[0][1] : 1;
    const markers = cities.map(([city, count]) => {
      const coord = CITY_COORDS[city] || getRandomCoordInBrazil();
      const relativeSize = Math.max(0.04, (count / highestCount) * 0.1);
      return { location: coord, size: relativeSize };
    });

    if (markers.length === 0) {
      markers.push({ location: [-23.5505, -46.6333], size: 0.1 }); 
    }

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 1200,   // Resolução aumentada para nitidez
      height: 1200,
      phi: 0,
      theta: 0.1,
      dark: 1,       // Modo escuro (pontos claros no fundo escuro)
      diffuse: 1.2,
      mapSamples: 12000,
      mapBrightness: 12,
      baseColor: [1, 1, 1], // Branco puro para os pontos do continente
      markerColor: [0.85, 0.16, 0.16], // Vermelho alerta
      glowColor: [1, 1, 1], // Brilho branco intenso
      markers: markers,
      onRender: (state) => {
        if (!pointerInteracting.current) {
          phi += 0.005; // Rotação infinita
        }
        state.phi = phi + currentPhi.current;
      },
    });

    return () => globe.destroy();
  }, [cities]); // Refaz apenas se a lista de cidades atualizar

  return (
    <div style={{
      width: '100%',
      maxWidth: 600,
      aspectRatio: '1 / 1',
      margin: '0 auto',
      position: 'relative'
    }}>
      <canvas
        ref={canvasRef}
        width={1000}
        height={1000}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            currentPhi.current = delta / 200;
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            currentPhi.current = delta / 100;
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
      />
    </div>
  );
}
