import React, { useState, useRef, useEffect, useCallback } from "react";
import { MoveHorizontal } from "lucide-react";
import { useLanguage } from "@/store/languageStore";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
}

export function BeforeAfterSlider({ beforeImage, afterImage }: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const stopDragging = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", stopDragging);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", stopDragging);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stopDragging);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stopDragging);
    };
  }, [isDragging, onMouseMove, onTouchMove, stopDragging]);

  const labelBefore = language === "PT" ? "Sem Edição" : language === "EN" ? "Before" : "Antes";
  const labelAfter = language === "PT" ? "Com Preset" : language === "EN" ? "After" : "Con Preset";

  return (
    <div 
      className="relative w-full aspect-[4/5] md:aspect-[3/2] xl:aspect-[2/1] md:rounded-[2rem] rounded-[1.5rem] overflow-hidden select-none touch-none cursor-ew-resize group shadow-2xl border-4 border-white"
      ref={containerRef}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
    >
      {/* Imagem Pós Edição (Background) */}
      <img 
        src={afterImage} 
        alt="After" 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none brightness-110 contrast-105"
        draggable={false}
      />
      
      {/* Tag "Depois" */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 bg-black/60 backdrop-blur-md px-3 md:px-5 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-black text-white uppercase tracking-[0.2em] z-0 shadow-lg flex items-center gap-2">
         {labelAfter}
      </div>

      {/* Imagem Pré Edição (Foreground que recorta) */}
      <img 
        src={beforeImage} 
        alt="Before" 
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        draggable={false}
      />
      
      {/* Tag "Antes" (Some se o slider for muito para a esquerda) */}
      <div 
        className="absolute top-4 left-4 md:top-6 md:left-6 bg-white/90 backdrop-blur-md px-3 md:px-5 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-black text-black uppercase tracking-[0.2em] z-20 shadow-lg border border-black/5"
        style={{ opacity: sliderPosition > 25 ? 1 : 0, transition: 'opacity 0.2s' }}
      >
         {labelBefore}
      </div>

      {/* Linha do Slider & Handle Central */}
      <div 
        className="absolute inset-y-0 w-1 bg-white flex items-center justify-center z-30 transition-transform duration-75 shadow-[0_0_15px_rgba(0,0,0,0.4)]"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center text-[#d82828] border--[2px] border-black/5 scale-100 group-active:scale-95 transition-transform cursor-grab active:cursor-grabbing">
          <MoveHorizontal size={24} strokeWidth={2.5} className="md:w-7 md:h-7" />
        </div>
      </div>
    </div>
  );
}
