import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

interface CityData {
  city: string;
  count: number;
  flag: string;
}

const CITY_COORDS: Record<string, [number, number]> = {
  "São Paulo":       [-23.55, -46.63],
  "Rio de Janeiro":  [-22.90, -43.17],
  "Belo Horizonte":  [-19.92, -43.94],
  "Brasília":        [-15.79, -47.88],
  "Curitiba":        [-25.43, -49.27],
  "Porto Alegre":    [-30.03, -51.22],
  "Salvador":        [-12.97, -38.50],
  "Fortaleza":       [-3.72,  -38.54],
  "Recife":          [-8.05,  -34.88],
  "Goiânia":         [-16.69, -49.26],
  "Manaus":          [-3.12,  -60.02],
  "Belém":           [-1.46,  -48.50],
  "Vitória":         [-20.32, -40.31],
  "Florianópolis":   [-27.60, -48.55],
  "Campinas":        [-22.91, -47.06],
  "Santos":          [-23.96, -46.33],
  "Uberlândia":      [-18.92, -48.28],
  "Joinville":       [-26.30, -48.85],
  "Londrina":        [-23.31, -51.16],
  "Maringá":         [-23.42, -51.93],
  "Natal":           [-5.79,  -35.21],
  "João Pessoa":     [-7.12,  -34.86],
  "Maceió":          [-9.67,  -35.74],
  "Aracaju":         [-10.95, -37.07],
  "Teresina":        [-5.09,  -42.80],
  "Campo Grande":    [-20.44, -54.65],
  "Cuiabá":          [-15.60, -56.10],
  "Porto Velho":     [-8.76,  -63.90],
  "Boa Vista":       [2.82,   -60.67],
  "Macapá":          [0.03,   -51.07],
  "Rio Branco":      [-9.97,  -67.81],
  "Palmas":          [-10.25, -48.32],
  "Ribeirão Preto":  [-21.17, -47.81],
  "Sorocaba":        [-23.50, -47.46],
  "Caxias do Sul":   [-29.17, -51.18],
  "Niterói":         [-22.88, -43.10],
  "Santarém":        [-2.44,  -54.71],
  "Anápolis":        [-16.33, -48.95],
  "Lisboa":          [38.72,  -9.14],
  "Porto":           [41.16,  -8.63],
  "Coimbra":         [40.21,  -8.43],
  "Braga":           [41.55,  -8.43],
  "Faro":            [37.02,  -7.93],
  "Setúbal":         [38.52,  -8.89],
  "Miami":           [25.76,  -80.19],
  "Orlando":         [28.54,  -81.38],
  "Nova York":       [40.71,  -74.01],
  "New York":        [40.71,  -74.01],
  "Londres":         [51.51,  -0.13],
  "London":          [51.51,  -0.13],
  "Paris":           [48.85,  2.35],
  "Madri":           [40.42,  -3.70],
  "Madrid":          [40.42,  -3.70],
  "Barcelona":       [41.39,  2.15],
  "Buenos Aires":    [-34.61, -58.38],
  "Santiago":        [-33.46, -70.65],
  "Bogotá":          [4.71,   -74.07],
  "Cidade do México":[19.43,  -99.13],
  "Tokyo":           [35.69,  139.69],
  "Dubai":           [25.20,  55.27],
  "Luanda":          [-8.84,  13.29],
};

export function AdminGlobe({ cities }: { cities: CityData[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<{ destroy: () => void } | null>(null);

  // Estado de rotação
  const phi = useRef(0.6);
  const theta = useRef(0.15);
  const targetPhi = useRef(0.6);
  const targetTheta = useRef(0.15);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const rafId = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let globe: { destroy: () => void } | null = null;
    let started = false;

    const start = (w: number, h: number) => {
      if (started || w === 0 || h === 0) return;
      started = true;

      const size = Math.min(w, h);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      
      canvas.width  = size * dpr;
      canvas.height = size * dpr;

      const maxCount = cities.length > 0 ? cities[0].count || 1 : 1;
      const markers = cities.length > 0
        ? cities.map(item => ({
            location: (CITY_COORDS[item.city] ?? [-15, -47]) as [number, number],
            size: Math.max(0.04, (item.count / maxCount) * 0.11),
          }))
        : [{ location: [-23.55, -46.63] as [number, number], size: 0.07 }];

      cancelAnimationFrame(rafId.current);
      const tick = () => {
        if (!isDragging.current) targetPhi.current += 0.004;
        phi.current   += (targetPhi.current   - phi.current)   * 0.1;
        theta.current += (targetTheta.current - theta.current) * 0.1;
        rafId.current = requestAnimationFrame(tick);
      };
      rafId.current = requestAnimationFrame(tick);

      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width:  size * dpr,
        height: size * dpr,
        phi:    phi.current,
        theta:  theta.current,
        dark: 1,
        diffuse: 3,
        mapSamples: 20000,
        mapBrightness: 14,
        baseColor:   [0.1, 0.2, 0.4],
        markerColor: [0.86, 0.16, 0.16],
        glowColor:   [0.2,  0.5,  1.0],
        markers,
        onRender: (state) => {
          state.phi   = phi.current;
          state.theta = theta.current;
          state.width = size * dpr;
          state.height = size * dpr;
        },
      });

      globeRef.current = globe;
    };

    // ResizeObserver dispara assim que o container tem dimensões reais
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        start(Math.floor(width), Math.floor(height));
      }
    });
    ro.observe(container);

    // Fallback imediato se já tem dimensões
    start(container.offsetWidth, container.offsetHeight);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId.current);
      globeRef.current?.destroy();
    };
  }, [cities]);

  // ── Interação mouse ───────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    targetPhi.current   += dx * 0.007;
    targetTheta.current  = Math.max(-0.5, Math.min(0.5, targetTheta.current - dy * 0.004));
  };
  const onPointerUp = () => { isDragging.current = false; };

  // ── Touch ─────────────────────────────────────────────────────────────────
  const lastTX = useRef(0);
  const lastTY = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    lastTX.current = e.touches[0].clientX;
    lastTY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - lastTX.current;
    const dy = e.touches[0].clientY - lastTY.current;
    lastTX.current = e.touches[0].clientX;
    lastTY.current = e.touches[0].clientY;
    targetPhi.current   += dx * 0.007;
    targetTheta.current  = Math.max(-0.5, Math.min(0.5, targetTheta.current - dy * 0.004));
  };
  const onTouchEnd = () => { isDragging.current = false; };

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          aspectRatio: '1/1',
          cursor: isDragging.current ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      />

      {/* Hint */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none select-none opacity-30">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>
        </svg>
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white">Arraste para girar</span>
      </div>
    </div>
  );
}
