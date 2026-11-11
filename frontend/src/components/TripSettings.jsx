import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, HardDrive, Box, Check } from "lucide-react";
import { toast } from "sonner";
import { useApi, errMsg } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import RoleSelect from "@/components/RoleSelect";

const PROVIDERS = [
  ["emergent_cloud", "TripGallery Cloud", Cloud, true],
  ["google_drive", "Google Drive", HardDrive, false],
  ["onedrive", "OneDrive", HardDrive, false],
  ["dropbox", "Dropbox", Box, false],
];

const Section = ({ title, desc, children }) => (
  <section className="grid lg:grid-cols-3 gap-6 py-8 border-b last:border-0">
    <div><h3 className="font-semibold text-lg">{title}</h3>{desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}</div>
    <div className="lg:col-span-2 space-y-4">{children}</div>
  </section>
);

export default function TripSettings({ trip, onChange }) {
  const api = useApi();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: trip.name, location: trip.location || "", start_date: trip.start_date || "", end_date: trip.end_date || "" });

  const patch = async (data) => {
    try { onChange((await api.patch(`/trips/${trip.id}`, data)).data); toast.success(t("saved")); }
    catch (e) { toast.error(errMsg(e, t("error"))); }
  };
  const del = async () => {
    if (!window.confirm(t("delete_trip_confirm"))) return;
    await api.delete(`/trips/${trip.id}`);
    navigate("/");
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div data-testid="trip-settings-view" className="max-w-4xl">
      <Section title={t("trip_name")}>
        <Input data-testid="settings-name-input" value={form.name} onChange={set("name")} />
        <Input data-testid="settings-location-input" value={form.location} onChange={set("location")} placeholder={t("destination")} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>{t("start_date")}</Label><Input type="date" value={form.start_date} onChange={set("start_date")} /></div>
          <div className="space-y-1.5"><Label>{t("end_date")}</Label><Input type="date" value={form.end_date} onChange={set("end_date")} /></div>
        </div>
        <Button data-testid="settings-save-btn" className="rounded-full" onClick={() => patch(form)}>{t("save")}</Button>
      </Section>
      <Section title={t("privacy")}>
        <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
          <Label htmlFor="inv">{t("invite_enabled")}</Label>
          <Switch id="inv" data-testid="settings-invite-switch" checked={trip.invite_enabled} onCheckedChange={(v) => patch({ invite_enabled: v })} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
          <Label>{t("default_role")}</Label>
          <RoleSelect value={trip.default_role} onChange={(v) => patch({ default_role: v })} testId="settings-default-role-select" className="w-44 rounded-full" />
        </div>
      </Section>
      <Section title={t("storage")} desc={t("storage_d")}>
        <div className="grid sm:grid-cols-2 gap-3">
          {PROVIDERS.map(([id, name, Icon, active]) => (
            <div key={id} data-testid={`storage-provider-${id}`} className={`rounded-2xl border p-4 flex items-center gap-3 ${active ? "ring-2 ring-[hsl(var(--brand))]" : "opacity-60"}`}>
              <Icon className="h-5 w-5" />
              <span className="font-medium flex-1">{name}</span>
              <span className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-1">
                {active ? <><Check className="h-3 w-3" />{t("storage_active")}</> : t("coming_soon")}
              </span>
            </div>
          ))}
        </div>
      </Section>
      <Section title={t("danger")}>
        <Button variant="destructive" className="rounded-full" data-testid="settings-delete-trip-btn" onClick={del}>{t("delete_trip")}</Button>
      </Section>
    </div>
  );
}
