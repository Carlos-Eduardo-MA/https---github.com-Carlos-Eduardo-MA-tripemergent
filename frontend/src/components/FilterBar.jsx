import { Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatDay } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function F({ value, onChange, testId, all, items }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testId} className="h-10 rounded-full w-auto min-w-[140px] max-w-[220px] text-sm"><SelectValue /></SelectTrigger>
      <SelectContent>
        {all && <SelectItem value="all">{all}</SelectItem>}
        {items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function FilterBar({ f, setF, options, dayNum, dayLabels, onReset, count }) {
  const { t, locale } = useI18n();
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const dirty = f.q || f.author !== "all" || f.day !== "all" || f.place !== "all" || f.type !== "all";
  return (
    <div className="sticky top-16 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 bg-background/85 backdrop-blur-xl">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input data-testid="filter-search-input" value={f.q} onChange={(e) => set("q")(e.target.value)} placeholder={t("search_ph")} className="h-11 rounded-full pl-11" />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1 items-center">
        <F testId="filter-author-select" value={f.author} onChange={set("author")} all={t("all_authors")} items={options.authors} />
        <F testId="filter-day-select" value={f.day} onChange={set("day")} all={t("all_days")}
          items={options.days.map((d) => [d, `${t("day")} ${dayNum(d)} · ${dayLabels?.[d] || formatDay(d, locale)}`])} />
        <F testId="filter-place-select" value={f.place} onChange={set("place")} all={t("all_places")} items={options.places.map((p) => [p, p])} />
        <F testId="filter-type-select" value={f.type} onChange={set("type")} all={t("all_types")} items={[["image", t("photos")], ["video", t("videos")]]} />
        <F testId="filter-sort-select" value={f.sort} onChange={set("sort")}
          items={[["date_asc", t("sort_date_asc")], ["date_desc", t("sort_date_desc")], ["size_desc", t("sort_size")], ["res_desc", t("sort_res")]]} />
        {dirty && (
          <button data-testid="filter-clear-btn" onClick={onReset} className="shrink-0 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground px-2">
            <X className="h-3 w-3" />{t("clear_filters")}
          </button>
        )}
        <span data-testid="filter-result-count" className="ml-auto shrink-0 text-xs font-mono text-muted-foreground pl-2">{count}</span>
      </div>
    </div>
  );
}
