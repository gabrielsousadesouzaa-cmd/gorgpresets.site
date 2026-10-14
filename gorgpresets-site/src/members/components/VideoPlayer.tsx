import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gauge, Loader2, Maximize, Minimize, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, Video, Volume1, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRepo } from "../context/MembersContext";
import { parseVideo, isStorageUrl } from "../lib/video";
import { formatClock } from "../lib/format";

interface VideoPlayerProps {
  url: string;
  poster?: string;
  startAt?: number;
  autoPlay?: boolean;
  onProgress?: (position: number, duration: number) => void;
  onEnded?: () => void;
  className?: string;
}

export function VideoPlayer({ url, poster, startAt = 0, autoPlay, onProgress, onEnded, className }: VideoPlayerProps) {
  const repo = useRepo();
  const source = parseVideo(url);
  const [resolved, setResolved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setResolved(null);
    setError(null);
    if (source.kind === "file" && isStorageUrl(source.src)) {
      repo
        .resolveMediaUrl(source.src)
        .then((u) => alive && setResolved(u))
        .catch((e: Error) => alive && setError(e.message));
    } else if (source.kind !== "none") {
      setResolved(source.src);
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, repo]);

  const frame = cn("relative aspect-video w-full overflow-hidden bg-black", className);

  if (source.kind === "none" || error) {
    return (
      <div className={cn(frame, "grid place-items-center")}>
        {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 blur-sm" />}
        <div className="relative flex flex-col items-center gap-3 text-center text-white/60">
          <Video className="h-10 w-10" />
          <p className="text-sm">{error || "O vídeo desta aula estará disponível em breve."}</p>
        </div>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className={cn(frame, "grid place-items-center")}>
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  if (source.kind === "embed") {
    return (
      <div className={frame}>
        <iframe
          key={resolved}
          src={resolved}
          title="Player de vídeo"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <FilePlayer
      key={resolved}
      src={resolved}
      poster={poster}
      startAt={startAt}
      autoPlay={autoPlay}
      onProgress={onProgress}
      onEnded={onEnded}
      className={frame}
    />
  );
}

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

function FilePlayer({ src, poster, startAt = 0, autoPlay, onProgress, onEnded, className }: Omit<VideoPlayerProps, "url"> & { src: string }) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number>();
  const lastReport = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [rateOpen, setRateOpen] = useState(false);
  const [controls, setControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [started, setStarted] = useState(false);

  // Ref para o callback não reiniciar efeitos a cada render do pai.
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  // Última posição conhecida (o <video> já pode ter sido desmontado na saída).
  const position = useRef({ time: 0, duration: 0, dirty: false });

  const report = useCallback((force = false) => {
    const v = video.current;
    if (v?.duration) position.current = { time: v.currentTime, duration: v.duration, dirty: position.current.dirty };
    const { time, duration: total, dirty } = position.current;
    if (!onProgressRef.current || !total || !dirty) return;
    const now = Date.now();
    if (!force && now - lastReport.current < 10_000) return;
    lastReport.current = now;
    position.current.dirty = false;
    onProgressRef.current(time, total);
  }, []);

  const poke = useCallback(() => {
    setControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (video.current && !video.current.paused) {
        setControls(false);
        setRateOpen(false);
      }
    }, 2600);
  }, []);

  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
    poke();
  }, [poke]);

  const seekBy = useCallback((delta: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = container.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (el?.requestFullscreen) {
      void el.requestFullscreen();
    } else if (v?.webkitEnterFullscreen) {
      v.webkitEnterFullscreen(); // iPhone
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      if (e.key === " " || e.key === "k") {
        if (target.tagName === "BUTTON" && e.key === " ") return;
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight") seekBy(5);
      else if (e.key === "ArrowLeft") seekBy(-5);
      else if (e.key === "f") toggleFullscreen();
      else if (e.key === "m") setMuted((m) => !m);
      else return;
      poke();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, seekBy, toggleFullscreen, poke]);

  useEffect(() => {
    if (video.current) {
      video.current.volume = volume;
      video.current.muted = muted;
    }
  }, [volume, muted]);

  useEffect(() => {
    if (video.current) video.current.playbackRate = rate;
  }, [rate]);

  // Salva a posição ao sair da aula.
  useEffect(() => () => report(true), [report]);
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const pct = duration ? (current / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={container}
      className={cn(className, "group/player select-none", !controls && playing && "cursor-none")}
      onMouseMove={poke}
      onMouseLeave={() => playing && setControls(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={video}
        src={src}
        poster={poster}
        playsInline
        autoPlay={autoPlay}
        preload="metadata"
        controlsList="nodownload"
        className="absolute inset-0 h-full w-full bg-black object-contain"
        onClick={toggle}
        onDoubleClick={toggleFullscreen}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration || 0);
          if (startAt > 3 && startAt < v.duration - 5) v.currentTime = startAt;
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCurrent(v.currentTime);
          position.current = { time: v.currentTime, duration: v.duration || 0, dirty: true };
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
          report();
        }}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          poke();
        }}
        onPause={() => {
          setPlaying(false);
          setControls(true);
          report(true);
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onEnded={() => {
          setPlaying(false);
          setControls(true);
          report(true);
          onEnded?.();
        }}
      />

      {waiting && playing && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}

      <AnimatePresence>
        {!playing && !waiting && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={toggle}
            className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-xl transition-colors hover:bg-white/25 md:h-20 md:w-20"
            aria-label="Reproduzir"
          >
            <Play className="ml-1 h-7 w-7 md:h-8 md:w-8" fill="currentColor" />
          </motion.button>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2.5 pt-14 transition-opacity duration-300 md:px-5 md:pb-4",
          controls || !started ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="relative">
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full">
            <div className="h-full bg-white/30" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(e) => {
              const v = video.current;
              if (v) v.currentTime = Number(e.target.value);
              setCurrent(Number(e.target.value));
            }}
            className="ma-range relative w-full"
            style={{ ["--ma-value" as string]: `${pct}%` }}
            aria-label="Posição do vídeo"
          />
        </div>

        <div className="mt-1 flex items-center gap-1 text-white md:gap-2">
          <IconBtn onClick={toggle} label={playing ? "Pausar" : "Reproduzir"}>
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </IconBtn>
          <IconBtn onClick={() => seekBy(-10)} label="Voltar 10 segundos" className="hidden sm:grid">
            <RotateCcw size={18} />
          </IconBtn>
          <IconBtn onClick={() => seekBy(10)} label="Avançar 10 segundos" className="hidden sm:grid">
            <RotateCw size={18} />
          </IconBtn>
          <div className="group/vol flex items-center">
            <IconBtn onClick={() => setMuted((m) => !m)} label={muted ? "Ativar som" : "Silenciar"} className="hidden sm:grid">
              <VolumeIcon size={19} />
            </IconBtn>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setMuted(Number(e.target.value) === 0);
              }}
              className="ma-range hidden w-0 opacity-0 transition-all duration-300 group-hover/vol:w-20 group-hover/vol:opacity-100 md:block"
              style={{ ["--ma-value" as string]: `${(muted ? 0 : volume) * 100}%` }}
              aria-label="Volume"
            />
          </div>
          <span className="ml-1 whitespace-nowrap text-[12px] font-medium tabular-nums text-white/85 md:text-[13px]">
            {formatClock(current)} <span className="text-white/40">/ {formatClock(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1 md:gap-2">
            <div className="relative">
              <IconBtn onClick={() => setRateOpen((o) => !o)} label="Velocidade">
                <span className="flex items-center gap-1 text-[12px] font-semibold">
                  <Gauge size={18} /> <span className="hidden sm:inline">{rate}x</span>
                </span>
              </IconBtn>
              <AnimatePresence>
                {rateOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="ma-glass absolute bottom-12 right-0 w-28 overflow-hidden rounded-xl p-1 ring-1 ring-white/10"
                  >
                    {RATES.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setRate(r);
                          setRateOpen(false);
                        }}
                        className={cn("w-full rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-white/10", r === rate ? "font-bold text-white" : "text-white/70")}
                      >
                        {r === 1 ? "Normal" : `${r}x`}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {"pictureInPictureEnabled" in document && (
              <IconBtn
                onClick={() => {
                  const v = video.current;
                  if (!v) return;
                  if (document.pictureInPictureElement) void document.exitPictureInPicture();
                  else void v.requestPictureInPicture?.().catch(() => undefined);
                }}
                label="Picture-in-picture"
                className="hidden sm:grid"
              >
                <PictureInPicture2 size={18} />
              </IconBtn>
            )}
            <IconBtn onClick={toggleFullscreen} label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}>
              {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ onClick, label, children, className }: { onClick: () => void; label: string; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={cn("grid h-9 min-w-9 place-items-center rounded-full px-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white", className)}>
      {children}
    </button>
  );
}
