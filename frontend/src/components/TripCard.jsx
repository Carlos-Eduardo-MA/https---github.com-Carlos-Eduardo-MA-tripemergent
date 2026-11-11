import { Link } from "react-router-dom";
import { Images, Users, MapPin, Crown } from "lucide-react";
import { fileUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { initials } from "@/lib/format";

const FALLBACKS = [
  "https://images.pexels.com/photos/369495/pexels-photo-369495.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "https://images.unsplash.com/photo-1650964996661-d9267f282b25?crop=entropy&cs=srgb&fm=jpg&q=70&w=900",
  "https://images.unsplash.com/photo-1695206597675-eff02e38f746?crop=entropy&cs=srgb&fm=jpg&q=70&w=900",
];

export default function TripCard({ trip, index }) {
  const { t, locale } = useI18n();
  const cover = fileUrl(trip.cover_url) || FALLBACKS[index % FALLBACKS.length];
  const fmt = (d) => d && new Date(d + "T00:00").toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  return (
    <Link to={`/trips/${trip.id}`} data-testid="trip-card-item"
      className="group rounded-3xl border bg-card overflow-hidden transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl fade-up"
      style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="relative h-48 overflow-hidden">
        <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        {trip.my_role === "owner" && (
          <span className="absolute top-3 left-3 rounded-full bg-white/90 text-slate-900 text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 flex items-center gap-1">
            <Crown className="h-3 w-3" />{t("owner")}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold tracking-tight line-clamp-1">{trip.name}</h3>
        <p className="text-xs font-mono text-muted-foreground mt-1 flex items-center gap-1.5">
          {trip.location && <><MapPin className="h-3 w-3" />{trip.location} · </>}
          {fmt(trip.start_date)}{trip.end_date && ` – ${fmt(trip.end_date)}`}
        </p>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex -space-x-2">
            {trip.member_avatars.map((m, i) => m.avatar
              ? <img key={i} src={m.avatar} alt="" className="h-7 w-7 rounded-full ring-2 ring-card object-cover" />
              : <span key={i} className="h-7 w-7 rounded-full ring-2 ring-card bg-muted text-[10px] grid place-items-center">{initials(m.name)}</span>)}
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1"><Images className="h-3.5 w-3.5" />{trip.media_count}</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{trip.member_count}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
