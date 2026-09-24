import type { Media } from "../shared/types.ts";

type Props = { media: Media[]; compact?: boolean };

export function MediaGrid({ media, compact = false }: Props) {
  if (media.length === 0) return null;
  const items = compact ? media.slice(0, 1) : media.slice(0, 4);
  const single = items.length === 1;
  return (
    <div
      className={`mt-3 grid gap-1 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 ${
        single ? "grid-cols-1" : "grid-cols-2"
      }`}
    >
      {items.map((m, i) => (
        <MediaItem
          key={m.id}
          media={m}
          single={single}
          wide={items.length === 3 && i === 0}
          compact={compact}
        />
      ))}
    </div>
  );
}

type ItemProps = { media: Media; single: boolean; wide: boolean; compact: boolean };

function MediaItem({ media: m, single, wide, compact }: ItemProps) {
  const cell = single ? "" : wide ? "col-span-2 aspect-[2/1]" : "aspect-[4/3]";
  const maxHeight = compact ? "max-h-64" : "max-h-[32rem]";
  const poster = m.thumbnail_url ?? undefined;

  if (m.type === "photo") {
    return (
      <a
        href={m.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block ${cell}`}
        aria-label="Open full-size image"
      >
        <img
          src={m.url}
          width={m.width}
          height={m.height}
          alt=""
          loading="lazy"
          className={single ? `w-full ${maxHeight} object-contain` : "h-full w-full object-cover"}
        />
      </a>
    );
  }
  if (m.type === "gif") {
    return (
      <video
        className={`${cell} ${single ? `w-full ${maxHeight}` : "h-full w-full object-cover"}`}
        style={single ? { aspectRatio: `${m.width} / ${m.height}` } : undefined}
        src={m.url}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }
  return (
    <video
      className={`${cell} bg-black ${single ? `w-full ${maxHeight}` : "h-full w-full"}`}
      style={single ? { aspectRatio: `${m.width} / ${m.height}` } : undefined}
      src={m.url}
      poster={poster}
      controls
      preload="none"
      playsInline
    />
  );
}
