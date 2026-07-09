export type VideoEmbed =
  | { provider: "youtube"; id: string }
  | { provider: "vimeo"; id: string }
  | { provider: "direct"; src: string };

/** Parse YouTube / Vimeo / direct MP4-WebM links for lazy embed */
export function parseVideoEmbed(url: string): VideoEmbed | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );

    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id ? { provider: "youtube", id } : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id =
        parsed.searchParams.get("v") ||
        parsed.pathname.match(/\/(?:shorts|embed|live)\/([^/?]+)/)?.[1];
      return id ? { provider: "youtube", id } : null;
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.match(/(?:video\/)?(\d+)/)?.[1];
      return id ? { provider: "vimeo", id } : null;
    }

    if (/\.(mp4|webm|ogg)(\?|$)/i.test(parsed.pathname)) {
      return { provider: "direct", src: parsed.toString() };
    }
  } catch {
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(trimmed)) {
      return { provider: "direct", src: trimmed };
    }
  }

  return null;
}

export function youtubeThumbnail(id: string, quality: "hq" | "max" = "hq") {
  const file = quality === "max" ? "maxresdefault" : "hqdefault";
  return `https://img.youtube.com/vi/${id}/${file}.jpg`;
}

export function vimeoThumbnail(id: string) {
  return `https://vumbnail.com/${id}.jpg`;
}

export function embedIframeSrc(embed: VideoEmbed): string {
  switch (embed.provider) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${embed.id}?autoplay=1&playsinline=1&rel=0`;
    case "vimeo":
      return `https://player.vimeo.com/video/${embed.id}?autoplay=1`;
    case "direct":
      return embed.src;
  }
}

export function defaultPosterForEmbed(embed: VideoEmbed): string | null {
  switch (embed.provider) {
    case "youtube":
      return youtubeThumbnail(embed.id);
    case "vimeo":
      return vimeoThumbnail(embed.id);
    default:
      return null;
  }
}
