// Interpreta o link de vídeo de uma aula. Aceita YouTube, Vimeo, Panda Video,
// Bunny Stream, Google Drive, Loom, arquivos .mp4/.webm/.mov e uploads feitos
// no Studio (storage://...).

export type VideoSource =
  | { kind: "none" }
  | { kind: "file"; src: string; provider: string }
  | { kind: "embed"; src: string; provider: string };

const FILE_EXT = /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i;

export function isStorageUrl(url: string): boolean {
  return url.startsWith("storage://");
}

export function parseVideo(rawUrl: string): VideoSource {
  const url = (rawUrl || "").trim();
  if (!url) return { kind: "none" };
  if (isStorageUrl(url) || url.startsWith("blob:") || url.startsWith("data:video")) {
    return { kind: "file", src: url, provider: "Upload" };
  }

  // Código de incorporação colado inteiro: extrai o src do iframe.
  const iframeSrc = url.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1];
  if (iframeSrc) return parseVideo(iframeSrc);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "none" };
  }
  const host = parsed.hostname.replace(/^www\./, "");

  const youtubeId = getYouTubeId(parsed);
  if (youtubeId) {
    const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1", color: "white" });
    const start = parsed.searchParams.get("t") || parsed.searchParams.get("start");
    if (start) params.set("start", String(parseInt(start, 10) || 0));
    return { kind: "embed", provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${youtubeId}?${params}` };
  }

  if (host.endsWith("vimeo.com")) {
    if (host === "player.vimeo.com") return { kind: "embed", provider: "Vimeo", src: url };
    const [id, hash] = parsed.pathname.split("/").filter(Boolean).filter((p) => /^\w+$/.test(p));
    if (id && /^\d+$/.test(id)) {
      const params = new URLSearchParams({ title: "0", byline: "0", portrait: "0", dnt: "1" });
      if (hash) params.set("h", hash);
      return { kind: "embed", provider: "Vimeo", src: `https://player.vimeo.com/video/${id}?${params}` };
    }
  }

  if (host.includes("pandavideo")) return { kind: "embed", provider: "Panda Video", src: url };
  if (host.includes("mediadelivery.net") || host.includes("b-cdn.net")) {
    if (FILE_EXT.test(parsed.pathname)) return { kind: "file", provider: "Bunny", src: url };
    return { kind: "embed", provider: "Bunny Stream", src: url.replace("/play/", "/embed/") };
  }

  if (host === "drive.google.com") {
    const id = parsed.pathname.match(/\/d\/([^/]+)/)?.[1] || parsed.searchParams.get("id");
    if (id) return { kind: "embed", provider: "Google Drive", src: `https://drive.google.com/file/d/${id}/preview` };
  }

  if (host.endsWith("loom.com")) {
    const id = parsed.pathname.split("/").filter(Boolean).pop();
    if (id) return { kind: "embed", provider: "Loom", src: `https://www.loom.com/embed/${id}` };
  }

  if (FILE_EXT.test(parsed.pathname)) return { kind: "file", provider: "Arquivo de vídeo", src: url };

  // Qualquer outro player que aceite iframe (Wistia, Vturb, etc.)
  return { kind: "embed", provider: host, src: url };
}

function getYouTubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const match = url.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{6,})/);
    if (match) return match[2];
  }
  return null;
}

/** Miniatura automática quando o produtor não envia uma (YouTube apenas). */
export function autoThumbnail(rawUrl: string): string {
  try {
    const id = getYouTubeId(new URL(rawUrl.trim()));
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
  } catch {
    return "";
  }
}

/** Lê a duração de um arquivo de vídeo local antes do upload. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(video.duration) ? Math.round(video.duration) : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(0);
    };
    video.src = objectUrl;
  });
}
