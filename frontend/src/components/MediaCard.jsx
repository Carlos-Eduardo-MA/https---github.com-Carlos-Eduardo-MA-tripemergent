import { Play, MapPin } from "lucide-react";
import { fileUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatTime, formatDay, dayKey, placeLabel, initials } from "@/lib/format";

export const Avatar = ({ src, name, className = "h-6 w-6" }) => src
  ? <img src={src} alt="" className={`${className} rounded-full object-cover`} />
  : <span className={`${className} rounded-full bg-muted text-[10px] grid place-items-center font-medium`}>{initials(name)}</span>;

export default function MediaCard({ m, onOpen, showDate }) {
  const { locale } = useI18n();
  const place = placeLabel(m);
  return (
    <button data-testid="media-card-item" onClick={onOpen}
      className="group relative block w-full text-left rounded-2xl overflow-hidden bg-muted focus:outline-none focus-visible:ring-2 ring-[hsl(var(--brand))]">
      {m.thumb_url ? (
        <img src={fileUrl(m.thumb_url)} alt={m.caption || m.filename} loading="lazy"
          style={m.width && m.height ? { aspectRatio: `${m.width}/${m.height}` } : undefined}
          className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      ) : m.media_type === "video" ? (
        <div className="relative">
          <video src={`${fileUrl(m.original_url)}#t=0.5`} preload="metadata" muted playsInline className="w-full aspect-video object-cover" />
          <span className="absolute inset-0 grid place-items-center"><span className="h-12 w-12 rounded-full bg-black/50 backdrop-blur grid place-items-center"><Play className="h-5 w-5 text-white fill-white" /></span></span>
        </div>
      ) : (
        <div className="aspect-square grid place-items-center text-xs font-mono text-muted-foreground p-4 break-all">{m.filename}</div>
      )}
      <div className="absolute inset-x-0 top-0 p-2.5 flex items-center gap-2 bg-gradient-to-b from-black/55 to-transparent text-white text-[11px] font-mono">
        <Avatar src={m.uploader_avatar} name={m.uploader_name} className="h-6 w-6 ring-1 ring-white/60" />
        <span className="truncate">{showDate && `${formatDay(dayKey(m.taken_at), locale)} · `}{formatTime(m.taken_at, locale)}</span>
        {place && <span className="ml-auto flex items-center gap-0.5 truncate max-w-[50%]"><MapPin className="h-3 w-3 shrink-0" />{m.city || place}</span>}
      </div>
      {(m.caption || m.tags?.length > 0) && (
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
          {m.caption && <p className="text-sm line-clamp-2">{m.caption}</p>}
          {m.tags?.length > 0 && <p className="text-[11px] font-mono opacity-80 mt-1 truncate">{m.tags.map((x) => `#${x}`).join(" ")}</p>}
        </div>
      )}
    </button>
  );
}
