import { useState } from "react";
import { toast } from "sonner";
import { useApi, errMsg } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import RoleSelect from "@/components/RoleSelect";

const EMPTY = { name: "", description: "", location: "", start_date: "", end_date: "", default_role: "editor" };

export default function CreateTripDialog({ open, onOpenChange, onCreated }) {
  const api = useApi();
  const { t } = useI18n();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/trips", { ...form, start_date: form.start_date || null, end_date: form.end_date || null });
      setForm(EMPTY);
      onOpenChange(false);
      onCreated(data);
    } catch (err) {
      toast.error(errMsg(err, t("error")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-trip-modal" className="rounded-3xl max-w-lg">
        <DialogHeader><DialogTitle className="font-display text-2xl">{t("new_trip")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("trip_name")}</Label>
            <Input data-testid="trip-name-input" required value={form.name} onChange={set("name")} placeholder={t("trip_name_ph")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("destination")}</Label>
            <Input data-testid="trip-location-input" value={form.location} onChange={set("location")} placeholder="Roma, Itália" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("start_date")}</Label><Input type="date" data-testid="trip-start-input" value={form.start_date} onChange={set("start_date")} /></div>
            <div className="space-y-1.5"><Label>{t("end_date")}</Label><Input type="date" data-testid="trip-end-input" value={form.end_date} onChange={set("end_date")} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("description")}</Label>
            <Textarea data-testid="trip-description-input" rows={2} value={form.description} onChange={set("description")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("default_role")}</Label>
            <RoleSelect value={form.default_role} onChange={set("default_role")} testId="trip-default-role-select" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={busy} data-testid="create-trip-submit-btn" className="rounded-full px-6">{t("create")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
