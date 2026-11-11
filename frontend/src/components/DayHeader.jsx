import { useState } from "react";
import { Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatDay } from "@/lib/format";
import { Input } from "@/components/ui/input";

export default function DayHeader({ dayKeyStr, num, trip, count, onTripChange }) {
  const api = useApi();
  const { t, locale } = useI18n();
  const label = trip.day_labels?.[dayKeyStr] || "";
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(label);

  const save = async () => {
    try {
      const { data } = await api.patch(`/trips/${trip.id}`, { day_labels: { ...(trip.day_labels || {}), [dayKeyStr]: val.trim() } });
      onTripChange(data);
      setEditing(false);
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <div className="flex items-baseline gap-3 flex-wrap border-b pb-3">
      <span className="font-mono text-xs uppercase tracking-widest text-[hsl(var(--brand))]">{t("day")} {String(num).padStart(2, "0")}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input autoFocus data-testid="day-label-input" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder={t("day_label_ph")} className="h-8 w-56" />
          <button data-testid="day-label-save-btn" onClick={save}><Check className="h-4 w-4" /></button>
        </div>
      ) : (
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{label || formatDay(dayKeyStr, locale)}</h2>
      )}
      {label && !editing && <span className="text-sm text-muted-foreground">{formatDay(dayKeyStr, locale)}</span>}
      {trip.my_role === "owner" && !editing && (
        <button data-testid="day-label-edit-btn" onClick={() => { setVal(label); setEditing(true); }} className="text-muted-foreground hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <span className="ml-auto text-xs font-mono text-muted-foreground">{count}</span>
    </div>
  );
}
