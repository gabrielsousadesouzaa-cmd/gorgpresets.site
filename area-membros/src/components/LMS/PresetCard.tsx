import { motion } from 'framer-motion'
import { Lock, Edit } from 'lucide-react'

interface PresetCardProps {
  preset: any
  isLocked: boolean
  isAdmin?: boolean
  onEdit?: () => void
  onClick?: () => void
  isPersonal?: boolean
}

export const PresetCard = ({ 
  preset, 
  isLocked, 
  isAdmin, 
  onEdit, 
  onClick, 
  isPersonal 
}: PresetCardProps) => {
  const handleCardClick = () => { 
    if (isLocked && preset.upsell_link) { 
      window.open(preset.upsell_link, '_blank'); 
    } else if (!isLocked) { 
      onClick?.(); 
    } 
  }

  return (
    <motion.div 
      onClick={handleCardClick} 
      initial={{ opacity: 0, scale: 0.95, y: 20 }} 
      whileInView={{ opacity: 1, scale: 1, y: 0 }} 
      viewport={{ once: true }}
      whileHover={{ y: -12, scale: isPersonal ? 1.02 : 1.03, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
      className={`group relative flex-none w-[220px] sm:w-[280px] aspect-[2/3] ${isPersonal ? 'rounded-3xl' : 'rounded-[2.5rem]'} overflow-hidden transition-all duration-1000 bg-[#0a0a0a] ${isLocked ? (preset.upsell_link ? 'cursor-pointer shadow-3xl' : 'opacity-80 grayscale-[0.8]') : 'cursor-pointer shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)]'}`}
    >
      <img src={preset.image} alt={preset.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
      
      {isAdmin && (
        <div className="absolute top-6 left-6 flex gap-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="p-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 hover:bg-[#d82828] hover:border-transparent transition-all text-white shadow-2xl">
            <Edit size={16} />
          </button>
        </div>
      )}

      {isLocked && (
        <div className="absolute top-6 right-6 z-30 p-4 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 text-white/40 shadow-2xl">
          <Lock size={18} />
        </div>
      )}
    </motion.div>
  )
}
