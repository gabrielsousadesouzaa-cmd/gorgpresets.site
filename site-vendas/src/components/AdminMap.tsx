import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Mapeamento de Cidade para País
const CITY_TO_COUNTRY: Record<string, string> = {
  "São Paulo": "Brasil",
  "Rio de Janeiro": "Brasil",
  "Belo Horizonte": "Brasil",
  "Brasília": "Brasil",
  "Curitiba": "Brasil",
  "Porto Alegre": "Brasil",
  "Salvador": "Brasil",
  "Fortaleza": "Brasil",
  "Recife": "Brasil",
  "Goiânia": "Brasil",
  "Manaus": "Brasil",
  "Belém": "Brasil",
  "Vitória": "Brasil",
  "Florianópolis": "Brasil",
  "Lisboa": "Portugal",
  "Porto": "Portugal",
  "Luanda": "Angola",
  "Miami": "Estados Unidos",
  "Orlando": "Estados Unidos"
};

// Coordenadas simplificadas para o mapa 2D (0-100% de largura/altura)
const CITY_MAP_POSITIONS: Record<string, { x: number, y: number }> = {
  "São Paulo": { x: 31, y: 78 },
  "Rio de Janeiro": { x: 33, y: 77 },
  "Belo Horizonte": { x: 32, y: 75 },
  "Brasília": { x: 30, y: 70 },
  "Curitiba": { x: 30, y: 81 },
  "Porto Alegre": { x: 29, y: 84 },
  "Salvador": { x: 35, y: 68 },
  "Fortaleza": { x: 36, y: 60 },
  "Recife": { x: 37, y: 64 },
  "Goiânia": { x: 29, y: 72 },
  "Manaus": { x: 23, y: 62 },
  "Belém": { x: 28, y: 60 },
  "Vitória": { x: 34, y: 75 },
  "Florianópolis": { x: 31, y: 82 },
  "Lisboa": { x: 46, y: 38 },
  "Porto": { x: 46, y: 36 },
  "Luanda": { x: 53, y: 66 },
  "Miami": { x: 22, y: 46 },
  "Orlando": { x: 22, y: 44 }
};

export function AdminMap({ cities }: { cities: Array<[string, number]> }) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const activeMarkers = useMemo(() => {
    const highestCount = cities.length > 0 ? cities[0][1] : 1;
    
    if (cities.length === 0) {
      return [{ x: 31, y: 78, size: 10, name: "São Paulo", country: "Brasil" }];
    }

    return cities.map(([city, count]) => {
      const pos = CITY_MAP_POSITIONS[city] || { 
        x: 25 + Math.random() * 15, 
        y: 65 + Math.random() * 15 
      };
      const country = CITY_TO_COUNTRY[city] || "Desconhecido";
      const relativeSize = Math.max(8, (count / highestCount) * 20);
      return { ...pos, size: relativeSize, name: city, country };
    });
  }, [cities]);

  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 overflow-hidden cursor-crosshair">
      {/* BACKGROUND RADAR GRID */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a1a1a_0%,transparent_70%)]" />
        <div className="w-full h-full border border-white/5 rounded-full absolute scale-100" />
        <div className="w-full h-full border border-white/5 rounded-full absolute scale-[0.75]" />
        <div className="w-full h-full border border-white/5 rounded-full absolute scale-[0.5]" />
        <div className="w-full h-full border border-white/5 rounded-full absolute scale-[0.25]" />
      </div>

      {/* SCANNING LINE */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute w-[100%] h-[100%] pointer-events-none z-0"
      >
        <div className="absolute top-1/2 left-1/2 w-[50%] h-[2px] bg-gradient-to-r from-[#d82828]/50 to-transparent origin-left -translate-y-1/2" />
      </motion.div>

      {/* STYLIZED WORLD DOTS */}
      <div className="absolute inset-0 opacity-10 flex flex-wrap gap-4 p-10 pointer-events-none">
        {[...Array(200)].map((_, i) => (
          <div key={i} className="w-1 h-1 bg-white rounded-full opacity-20" />
        ))}
      </div>

      {/* ACTIVE CITY MARKERS */}
      <div className="absolute inset-0 z-10">
        {activeMarkers.map((marker, i) => (
          <div 
            key={i}
            className="absolute cursor-pointer group"
            style={{ 
              left: `${marker.x}%`, 
              top: `${marker.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            onMouseEnter={() => setSelectedCity(marker.name)}
            onMouseLeave={() => setSelectedCity(null)}
            onClick={() => setSelectedCity(selectedCity === marker.name ? null : marker.name)}
          >
            {/* PULSE EFFECT */}
            <motion.div 
              animate={{ scale: [1, 2], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-[#d82828]"
              style={{ width: marker.size * 2, height: marker.size * 2, marginLeft: -marker.size, marginTop: -marker.size }}
            />
            {/* CORE POINT */}
            <motion.div 
              whileHover={{ scale: 1.5 }}
              className={`rounded-full shadow-[0_0_15px_rgba(216,40,40,0.5)] border border-white/20 relative z-10 transition-colors ${selectedCity === marker.name ? 'bg-white' : 'bg-[#d82828]'}`}
              style={{ width: marker.size, height: marker.size }}
            />
            
            {/* TOOLTIP ON HOVER/CLICK */}
            <AnimatePresence>
              {selectedCity === marker.name && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                >
                  <div className="bg-white text-black p-3 rounded-2xl shadow-2xl min-w-[140px] border border-white/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Localização</p>
                    <p className="text-sm font-black uppercase tracking-tighter leading-tight">{marker.name}</p>
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                      <div className="w-2 h-2 rounded-full bg-[#d82828]" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{marker.country}</p>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="w-3 h-3 bg-white rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 shadow-lg" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* OVERLAY VIGNETTE */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />
    </div>
  );
}

