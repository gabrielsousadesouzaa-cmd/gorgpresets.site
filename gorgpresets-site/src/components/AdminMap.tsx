import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface CityData {
  city: string;
  count: number;
  flag: string;
}

// ─── Coordenadas geográficas reais (lat, lon) ─────────────────────────────────
// Projeção Equirretangular: x = (lon + 180) / 360 * W | y = (90 - lat) / 180 * H
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
  "Lisboa":          [38.72,  -9.14],
  "Porto":           [41.16,  -8.63],
  "Coimbra":         [40.21,  -8.43],
  "Braga":           [41.55,  -8.43],
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

// Converte lat/lon para % dentro do SVG 1000x500
function toSVG(lat: number, lon: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * 1000,
    y: ((90 - lat) / 180) * 500,
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function AdminMap({ cities }: { cities: CityData[] }) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const maxCount = cities.length > 0 ? cities[0].count : 1;

  const markers = useMemo(() => {
    if (cities.length === 0) {
      const pos = toSVG(-23.55, -46.63);
      return [{ ...pos, size: 10, pulse: 18, name: 'São Paulo', flag: '🇧🇷', count: 0, isTop: true, isPlaceholder: true }];
    }
    return cities.map((item, i) => {
      const coords = CITY_COORDS[item.city];
      const pos = coords ? toSVG(coords[0], coords[1]) : toSVG(-15 + Math.random() * 10, -50 + Math.random() * 10);
      const ratio = item.count / maxCount;
      const size = Math.max(7, ratio * 18);
      return { ...pos, size, pulse: size * 2, name: item.city, flag: item.flag, count: item.count, isTop: i === 0, isPlaceholder: false };
    });
  }, [cities, maxCount]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ minHeight: 380 }}>

      {/* ── Fundo oceano ───────────────────────────────────────────────────── */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1a2e 50%, #080d18 100%)' }} />

      {/* ── SVG: Mapa-mundi com continentes visíveis ────────────────────────── */}
      <svg
        viewBox="0 0 1000 500"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Grade geográfica */}
        {[100, 200, 300, 400].map(y => (
          <line key={`h${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="white" strokeOpacity="0.04" strokeWidth="1"/>
        ))}
        {[200, 400, 600, 800].map(x => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="500" stroke="white" strokeOpacity="0.04" strokeWidth="1"/>
        ))}

        {/* ─── Continentes ─── */}
        {/* América do Norte */}
        <path
          d="M 95,55 L 155,45 L 200,52 L 225,68 L 235,90 L 245,118 L 255,138 L 248,162 L 265,178 L 258,200 L 245,215 L 238,238 L 218,250 L 205,240 L 190,248 L 178,235 L 165,242 L 155,230 L 148,215 L 140,198 L 130,185 L 125,168 L 115,152 L 108,130 L 100,112 L 92,90 L 88,70 Z"
          fill="#1e3a5f" stroke="#2d5a8e" strokeWidth="1.2" opacity="0.85"
        />
        {/* Flórida */}
        <path d="M 218,250 L 225,265 L 215,272 L 208,258 L 218,250 Z" fill="#1e3a5f" stroke="#2d5a8e" strokeWidth="0.8" opacity="0.85"/>

        {/* México e América Central */}
        <path
          d="M 168,242 L 195,248 L 210,265 L 205,285 L 195,295 L 182,290 L 175,278 L 165,268 L 162,255 Z"
          fill="#1e3a5f" stroke="#2d5a8e" strokeWidth="1" opacity="0.85"
        />

        {/* América do Sul */}
        <path
          d="M 240,275 L 278,265 L 310,272 L 335,290 L 345,320 L 348,355 L 340,390 L 325,420 L 305,445 L 285,455 L 265,448 L 250,430 L 242,405 L 238,375 L 242,345 L 238,318 L 235,295 Z"
          fill="#1a4a2e" stroke="#2d7a4a" strokeWidth="1.2" opacity="0.85"
        />

        {/* Europa */}
        <path
          d="M 455,65 L 490,58 L 520,62 L 542,72 L 548,88 L 535,100 L 518,105 L 505,118 L 490,122 L 472,115 L 460,102 L 452,88 L 450,75 Z"
          fill="#2a1a4a" stroke="#4a2d8e" strokeWidth="1.2" opacity="0.9"
        />
        {/* Península Ibérica */}
        <path d="M 455,95 L 470,90 L 480,100 L 475,115 L 460,118 L 452,108 Z" fill="#2a1a4a" stroke="#4a2d8e" strokeWidth="0.8" opacity="0.9"/>
        {/* Península Escandinava */}
        <path d="M 490,42 L 505,35 L 520,45 L 515,62 L 498,68 L 488,58 Z" fill="#2a1a4a" stroke="#4a2d8e" strokeWidth="0.8" opacity="0.9"/>

        {/* África */}
        <path
          d="M 465,118 L 510,108 L 548,115 L 568,138 L 575,168 L 578,205 L 572,242 L 558,280 L 540,318 L 518,348 L 495,358 L 472,345 L 455,315 L 448,278 L 450,240 L 455,205 L 458,168 L 460,140 Z"
          fill="#3a2a0a" stroke="#6a4a15" strokeWidth="1.2" opacity="0.85"
        />

        {/* Médio Oriente */}
        <path
          d="M 570,115 L 610,108 L 625,120 L 618,140 L 600,148 L 582,142 L 572,130 Z"
          fill="#2a1a0a" stroke="#5a3a15" strokeWidth="0.8" opacity="0.8"
        />

        {/* Ásia */}
        <path
          d="M 545,55 L 610,42 L 680,38 L 745,45 L 800,52 L 845,65 L 858,85 L 848,108 L 820,125 L 790,130 L 758,138 L 728,142 L 705,130 L 680,135 L 655,128 L 630,132 L 608,125 L 585,118 L 565,108 L 548,88 Z"
          fill="#1a2a3a" stroke="#2d4a6a" strokeWidth="1.2" opacity="0.85"
        />
        {/* Sub-continente Indiano */}
        <path
          d="M 640,130 L 678,135 L 698,155 L 692,185 L 675,205 L 655,195 L 638,175 L 635,152 Z"
          fill="#1a2a3a" stroke="#2d4a6a" strokeWidth="1" opacity="0.85"
        />
        {/* Sudeste Asiático */}
        <path
          d="M 758,138 L 800,148 L 815,168 L 805,188 L 788,195 L 768,182 L 755,162 Z"
          fill="#1a2a3a" stroke="#2d4a6a" strokeWidth="1" opacity="0.85"
        />

        {/* Japão */}
        <path d="M 848,88 L 862,82 L 870,95 L 862,108 L 850,105 Z" fill="#1a2a3a" stroke="#2d4a6a" strokeWidth="0.8" opacity="0.85"/>

        {/* Austrália */}
        <path
          d="M 762,285 L 810,272 L 855,278 L 875,298 L 872,332 L 848,352 L 815,358 L 782,342 L 762,318 L 758,298 Z"
          fill="#2a1a0a" stroke="#5a3a15" strokeWidth="1.2" opacity="0.85"
        />

        {/* Groenlândia */}
        <path
          d="M 205,18 L 248,12 L 272,22 L 268,42 L 245,52 L 218,48 L 205,35 Z"
          fill="#0e2240" stroke="#1a3a6a" strokeWidth="0.8" opacity="0.6"
        />

        {/* ─── Marcadores SVG das cidades ─── */}
        {markers.map((marker, i) => (
          <g key={i}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredCity(marker.name)}
            onMouseLeave={() => setHoveredCity(prev => prev === marker.name ? null : prev)}
            onClick={() => setHoveredCity(prev => prev === marker.name ? null : marker.name)}
          >
            {/* Círculo invisível maior para facilitar o clique/touch */}
            <circle cx={marker.x} cy={marker.y} r={Math.max(20, marker.size * 1.5)} fill="transparent" />
            
            {/* Anel de pulse (animado via CSS) */}
            <circle
              cx={marker.x} cy={marker.y}
              r={marker.pulse}
              fill="none"
              stroke={marker.isTop ? '#d82828' : 'rgba(255,255,255,0.5)'}
              strokeWidth="1"
              opacity="0"
              style={{
                animation: `pingMap 2.2s ease-out ${i * 0.25}s infinite`,
              }}
            />
            {/* Anel externo extra para top */}
            {marker.isTop && (
              <circle
                cx={marker.x} cy={marker.y}
                r={marker.pulse * 1.5}
                fill="none"
                stroke="#d82828"
                strokeWidth="0.8"
                opacity="0"
                style={{ animation: `pingMap 2.2s ease-out ${i * 0.25 + 0.6}s infinite` }}
              />
            )}
            {/* Ponto principal */}
            <circle
              cx={marker.x} cy={marker.y}
              r={marker.size / 2}
              fill={marker.isTop ? '#d82828' : 'rgba(255,255,255,0.85)'}
              stroke="white"
              strokeWidth={marker.isTop ? 1.5 : 1}
              filter={marker.isTop ? 'url(#glow)' : undefined}
            />
          </g>
        ))}
      </svg>

      {/* ── Injeção de keyframe CSS ──────────────────────────────────────────── */}
      <style>{`
        @keyframes pingMap {
          0%   { r: ${4}; opacity: 0.7; }
          100% { r: ${40}; opacity: 0; }
        }
      `}</style>

      {/* ── Tooltip HTML (posicionado em % sobre o container) ──────────────── */}
      <AnimatePresence>
        {hoveredCity && (() => {
          const m = markers.find(mk => mk.name === hoveredCity);
          if (!m || m.isPlaceholder) return null;
          // Converte coordenada SVG (0-1000 x 0-500) para % do container
          const left = `${(m.x / 1000) * 100}%`;
          const top  = `${(m.y / 500) * 100}%`;
          return (
            <motion.div
              key={hoveredCity}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 pointer-events-none"
              style={{ left, top, transform: 'translate(-50%, calc(-100% - 16px))' }}
            >
              <div className="bg-white/95 backdrop-blur-xl text-black px-4 py-3 rounded-2xl shadow-2xl min-w-[130px] text-center">
                <div className="text-2xl mb-1">{m.flag}</div>
                <p className="text-[11px] font-black uppercase tracking-wide text-gray-900 leading-tight">{m.name}</p>
                <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                  <div className="w-2 h-2 rounded-full bg-[#d82828]" />
                  <p className="text-[10px] font-black text-[#d82828]">{m.count} acesso{m.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="w-3 h-3 bg-white rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Vinheta nas bordas ────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.7), inset 0 0 40px rgba(0,0,0,0.5)'
      }} />

      {/* ── Legenda ───────────────────────────────────────────────────────────── */}
      {cities.length > 0 && (
        <div className="absolute bottom-14 left-6 flex items-center gap-4 z-20">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#d82828] shadow-[0_0_8px_rgba(216,40,40,0.8)]" />
            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Nº 1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white opacity-70" />
            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Outras</span>
          </div>
        </div>
      )}
    </div>
  );
}
