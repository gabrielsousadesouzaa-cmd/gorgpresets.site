import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, TrendingUp, MapPin, Zap, Globe, Activity, MousePointer2, Radar as RadarIcon, Crosshair } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- CONFIGURAÇÃO ---

interface LivePing {
  id: string;
  city: string;
  country: string;
  flag: string;
  angle: number;
  distance: number;
  timestamp: number;
}

// Mapeamento simples de países para bandeiras
const FLAG_MAP: Record<string, string> = {
  'Brazil': '🇧🇷', 'Brasil': '🇧🇷', 'United States': '🇺🇸', 'USA': '🇺🇸',
  'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'Portugal': '🇵🇹', 'Spain': '🇪🇸',
  'Germany': '🇩🇪', 'France': '🇫🇷', 'Japan': '🇯🇵', 'China': '🇨🇳',
  'Argentina': '🇦🇷', 'Mexico': '🇲🇽'
};

function getFlag(location: string = '') {
  const parts = location.split(', ');
  const country = parts[parts.length - 1];
  return FLAG_MAP[country] || '🌐';
}

export function GlobalRadar() {
  const [pings, setPings] = useState<LivePing[]>([]);

  useEffect(() => {
    // 1. Escutar por NOVAS visitas em TEMPO REAL (Iniciando do Zero)
    const channel = supabase
      .channel('realtime_visits_zero')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'site_visits' }, (payload) => {
        const v = payload.new;
        const newPing: LivePing = {
          id: v.id.toString(),
          city: v.location?.split(',')[0] || 'Novo Acesso',
          country: 'Global',
          flag: getFlag(v.location),
          angle: Math.random() * 360,
          distance: 10 + Math.random() * 85,
          timestamp: Date.now()
        };
        setPings(prev => [newPing, ...prev].slice(0, 15));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);



  return (
    <div className="w-full bg-[#020202] rounded-[3rem] relative overflow-hidden h-full border border-white/5 shadow-2xl group min-h-[500px]">
        <div className="absolute inset-0 pointer-events-none z-10">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="absolute top-8 left-8 z-20 space-y-1">
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#d82828] animate-pulse shadow-[0_0_15px_#d82828]" />
              <h3 className="text-white text-xl font-black uppercase tracking-tighter italic">Global Presence Radar</h3>
           </div>
           <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.4em]">Tracking: Online</p>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
           <div className="relative w-[500px] h-[500px] flex items-center justify-center scale-90 md:scale-100">
              {[100, 75, 50, 25].map((size) => (
                <div key={size} style={{ width: `${size}%`, height: `${size}%` }} className="absolute border border-white/[0.05] rounded-full" />
              ))}
              <div className="absolute w-full h-[1px] bg-white/[0.05]" />
              <div className="absolute h-full w-[1px] bg-white/[0.05]" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute w-full h-full rounded-full z-10 origin-center pointer-events-none"
                style={{ 
                  background: 'conic-gradient(from 0deg, rgba(216, 40, 40, 0.15) 0deg, transparent 90deg)',
                  willChange: 'transform',
                  transform: 'translateZ(0)'
                }}
              />
              <AnimatePresence initial={false}>
                {pings.map((p) => {
                   const x = 50 + (p.distance / 2) * Math.cos((p.angle * Math.PI) / 180);
                   const y = 50 + (p.distance / 2) * Math.sin((p.angle * Math.PI) / 180);
                   return (
                     <motion.div 
                       key={p.id} 
                       initial={{ opacity: 0, scale: 0 }} 
                       animate={{ opacity: 1, scale: 1 }} 
                       exit={{ opacity: 0, scale: 0 }} 
                       className="absolute z-20 group" 
                       style={{ 
                         left: `${x}%`, 
                         top: `${y}%`,
                         willChange: 'opacity, transform',
                         transform: 'translateZ(0)'
                       }}
                     >
                        <div className="relative">
                           <div className="w-2.5 h-2.5 bg-[#d82828] rounded-full animate-ping absolute inset-0 opacity-40" />
                           <div className="w-2.5 h-2.5 bg-[#d82828] rounded-full border-2 border-white shadow-[0_0_15px_#d82828]" />
                        </div>
                     </motion.div>
                   );
                })}
              </AnimatePresence>

              <div className="w-3 h-3 bg-white rounded-full z-30 shadow-[0_0_15px_white]" />
           </div>
        </div>

        <div className="absolute bottom-8 right-8 z-20 text-right">
           <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Nodes Active</p>
              <span className="text-xl font-black text-white tabular-nums italic">{pings.length} Global</span>
           </div>
        </div>
    </div>
  );
}

export function LiveViewDashboard() {
  const [activeVisitors, setActiveVisitors] = useState(0);
  const [sparklineData, setSparklineData] = useState<number[]>(Array(40).fill(0));
  
  useEffect(() => {
    // Monitorar visitantes ativos reais (Opcional: implementar lógica de presença)
    // Por enquanto, inicia em 0 e aguarda pings reais
  }, []);


  const renderSparkline = () => {
    const width = 400;
    const height = 80;
    const points = sparklineData.map((val, i) => `${(i * (width / (sparklineData.length - 1)))},${height - (val / 100) * height}`).join(' ');
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d82828" stopOpacity="0" />
            <stop offset="50%" stopColor="#d82828" stopOpacity="1" />
            <stop offset="100%" stopColor="#d82828" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} className="transition-all duration-1000" />
      </svg>
    );
  };

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in duration-1000">
      <div className="w-full bg-[#020202] rounded-[4rem] relative overflow-hidden h-[700px] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.8)] group">
        <div className="absolute inset-0 pointer-events-none z-10">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
        <div className="absolute top-12 left-12 z-20 space-y-2">
           <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#d82828] animate-pulse shadow-[0_0_20px_#d82828]" />
              <h3 className="text-white text-3xl font-black uppercase tracking-tighter italic">Global Presence Radar</h3>
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Freq: 2.4GHz / Range: Global</span>
              <div className="h-3 w-[1px] bg-white/10" />
              <span className="text-[10px] font-black text-[#d82828] uppercase tracking-[0.4em] italic">Tracking: Online</span>
           </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
            <GlobalRadar />
        </div>
        <div className="absolute bottom-12 right-12 z-20 text-right space-y-4">
           <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl min-w-[200px]">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Total Scanned (24h)</p>
              <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-black text-white tabular-nums italic tracking-tighter">1,284</span>
                 <span className="text-[10px] font-bold text-emerald-500">+12%</span>
              </div>
           </div>
           <div className="flex justify-end gap-3">
              <div className="px-4 py-2 bg-[#d82828] text-white text-[9px] font-black uppercase rounded-full">Secure Node</div>
              <div className="px-4 py-2 bg-white/10 text-white text-[9px] font-black uppercase rounded-full backdrop-blur-md">Uptime: 100%</div>
           </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-[3.5rem] p-10 border border-black/5 shadow-2xl relative overflow-hidden group">
           <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                 <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white">
                    <Crosshair size={28} />
                 </div>
                 <div className="bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Real-Time</span>
                 </div>
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Global Active Users</p>
                 <h4 className="text-8xl font-black text-gray-950 tracking-tighter italic">{activeVisitors}</h4>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-black text-[11px] uppercase tracking-widest italic pt-6 border-t border-black/5">
                 <TrendingUp size={16} />
                 <span>Growth Detected</span>
              </div>
           </div>
        </div>
        <div className="bg-black rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden text-white lg:col-span-2 group">
           <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h5 className="text-4xl font-black italic tracking-tighter">Network Intensity</h5>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Live Stream Data</p>
                 </div>
                 <div className="w-16 h-16 bg-[#d82828] rounded-[2rem] flex items-center justify-center shadow-[0_0_30px_rgba(216,40,40,0.3)]">
                    <Zap size={32} className="text-white" fill="currentColor" />
                 </div>
              </div>
              <div className="py-8">{renderSparkline()}</div>
              <div className="grid grid-cols-3 gap-8">
                 <div>
                    <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Peak Rate</p>
                    <span className="text-xl font-black italic">94.2%</span>
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Latency</p>
                    <span className="text-xl font-black italic">14ms</span>
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Uptime</p>
                    <span className="text-xl font-black italic text-emerald-500">99.9%</span>
                 </div>
              </div>
           </div>
        </div>
        <div className="flex flex-col gap-6">
           {[
             { label: "Session Time", val: "04:22", icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
             { label: "Active Nodes", val: "12 Global", icon: Globe, color: "text-[#d82828]", bg: "bg-red-50" }
           ].map((s, i) => (
             <div key={i} className="bg-white p-8 rounded-[3rem] border border-black/5 shadow-xl flex items-center gap-6 flex-1 group hover:scale-[1.02] transition-all">
                <div className={`${s.bg} ${s.color} w-16 h-16 rounded-[1.5rem] flex items-center justify-center`}>
                   <s.icon size={28} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                   <span className="text-2xl font-black text-gray-950 italic tracking-tighter">{s.val}</span>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
