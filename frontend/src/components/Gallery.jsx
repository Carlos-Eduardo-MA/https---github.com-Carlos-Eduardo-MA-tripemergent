import { useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { dayKey, placeLabel, tripDays } from "@/lib/format";
import FilterBar from "@/components/FilterBar";
import MediaCard from "@/components/MediaCard";
import DayHeader from "@/components/DayHeader";

const INIT = { q: "", author: "all", day: "all", place: "all", type: "all", sort: "date_asc" };

export default function Gallery({ media, trip, onOpen, onTripChange }) {
  const { t } = useI18n();
  const [f, setF] = useState(INIT);
  const { keys, dayNum } = useMemo(() => tripDays(media, trip.start_date), [media, trip.start_date]);

  const options = useMemo(() => ({
    authors: [...new Map(media.map((m) => [m.uploader_id, m.uploader_name])).entries()],
    places: [...new Set(media.map(placeLabel).filter(Boolean))].sort(),
    days: keys,
  }), [media, keys]);

  const list = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    let out = media.filter((m) =>
      (f.author === "all" || m.uploader_id === f.author) &&
      (f.day === "all" || dayKey(m.taken_at) === f.day) &&
      (f.place === "all" || placeLabel(m) === f.place) &&
      (f.type === "all" || m.media_type === f.type) &&
      (!q || [m.caption, m.uploader_name, m.city, m.country, m.filename, ...(m.tags || []), trip.day_labels?.[dayKey(m.taken_at)]]
        .filter(Boolean).join(" ").toLowerCase().includes(q)));
    const sorters = {
      date_asc: (a, b) => (a.taken_at || "").localeCompare(b.taken_at || ""),
      date_desc: (a, b) => (b.taken_at || "").localeCompare(a.taken_at || ""),
      size_desc: (a, b) => b.size - a.size,
      res_desc: (a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0),
    };
    return [...out].sort(sorters[f.sort]);
  }, [media, f, trip.day_labels]);

  const grouped = f.sort.startsWith("date");
  const groups = useMemo(() => {
    if (!grouped) return [];
    const g = new Map();
    list.forEach((m) => { const k = dayKey(m.taken_at); g.set(k, [...(g.get(k) || []), m]); });
    return [...g.entries()];
  }, [list, grouped]);

  if (!media.length) {
    return (
      <div data-testid="gallery-empty-state" className="rounded-3xl border border-dashed py-20 text-center">
        <ImageOff className="h-8 w-8 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold">{t("empty_gallery")}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{t("empty_gallery_d")}</p>
      </div>
    );
  }

  return (
    <div data-testid="trip-gallery-timeline">
      <FilterBar f={f} setF={setF} options={options} dayNum={dayNum} dayLabels={trip.day_labels} onReset={() => setF(INIT)} count={list.length} />
      {!list.length && <p data-testid="gallery-no-results" className="py-16 text-center text-muted-foreground">{t("no_results")}</p>}
      {grouped ? groups.map(([k, items]) => (
        <section key={k} data-testid="timeline-day-group" className="mt-10">
          <DayHeader dayKeyStr={k} num={dayNum(k)} trip={trip} count={items.length} onTripChange={onTripChange} />
          <div className="masonry mt-5">{items.map((m) => <MediaCard key={m.id} m={m} onOpen={() => onOpen(m.id)} />)}</div>
        </section>
      )) : (
        <div className="masonry mt-8">{list.map((m) => <MediaCard key={m.id} m={m} onOpen={() => onOpen(m.id)} showDate />)}</div>
      )}
    </div>
  );
}
