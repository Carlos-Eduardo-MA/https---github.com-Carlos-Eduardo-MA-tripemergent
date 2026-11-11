import { useCallback, useEffect, useState } from "react";
import { Trophy, HardDrive, Images, UserX } from "lucide-react";
import { toast } from "sonner";
import { useApi, errMsg } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatBytes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/MediaCard";
import RoleSelect from "@/components/RoleSelect";

function Stat({ icon: Icon, label, value, sub, testId }) {
  return (
    <div data-testid={testId} className="rounded-3xl border bg-card p-6">
      <Icon className="h-5 w-5 text-[hsl(var(--brand))]" />
      <p className="mt-5 text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold font-display truncate">{value}</p>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function MembersPanel({ trip }) {
  const api = useApi();
  const { t, locale } = useI18n();
  const [members, setMembers] = useState([]);
  const isOwner = trip.my_role === "owner";
  const load = useCallback(() => api.get(`/trips/${trip.id}/members`).then((r) => setMembers(r.data)), [api, trip.id]);
  useEffect(() => { load(); }, [load]);

  const top = [...members].sort((a, b) => b.photos + b.videos - (a.photos + a.videos))[0];
  const totalBytes = members.reduce((s, m) => s + m.bytes, 0);
  const totalMedia = members.reduce((s, m) => s + m.photos + m.videos, 0);

  const setRole = async (uid, role) => {
    try { await api.patch(`/trips/${trip.id}/members/${uid}`, { role }); load(); toast.success(t("saved")); }
    catch (e) { toast.error(errMsg(e, t("error"))); }
  };
  const remove = async (uid) => {
    if (!window.confirm(t("remove_confirm"))) return;
    try { await api.delete(`/trips/${trip.id}/members/${uid}`); load(); }
    catch (e) { toast.error(errMsg(e, t("error"))); }
  };

  return (
    <div data-testid="members-panel-view">
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat testId="stat-top-contributor" icon={Trophy} label={t("top_contributor")} value={top && top.photos + top.videos ? top.name : "—"}
          sub={top && top.photos + top.videos ? `${top.photos} ${t("photos").toLowerCase()} · ${top.videos} ${t("videos").toLowerCase()}` : null} />
        <Stat testId="stat-total-media" icon={Images} label={t("total_media")} value={totalMedia} />
        <Stat testId="stat-total-storage" icon={HardDrive} label={t("total_storage")} value={formatBytes(totalBytes)} />
      </div>
      <h2 className="mt-12 mb-4 text-xl font-bold">{t("members_title")} <span className="font-mono text-sm text-muted-foreground">({members.length})</span></h2>
      <div className="rounded-3xl border bg-card divide-y">
        {members.map((m) => (
          <div key={m.user_id} data-testid="member-row" className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
            <Avatar src={m.avatar} name={m.name} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{m.name}</p>
              <p className="text-sm text-muted-foreground">
                {t("uploaded")} <b className="text-foreground">{m.photos}</b> {t("photos").toLowerCase()} · <b className="text-foreground">{m.videos}</b> {t("videos").toLowerCase()} · <span className="font-mono text-xs">{formatBytes(m.bytes)}</span>
              </p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{t("joined")} {new Date(m.joined_at).toLocaleDateString(locale)}</p>
            </div>
            {m.role === "owner" || !isOwner ? (
              <span className="text-xs font-mono uppercase tracking-wider rounded-full bg-muted px-3 py-1">{t(m.role)}</span>
            ) : (
              <div className="flex items-center gap-2">
                <RoleSelect value={m.role} onChange={(r) => setRole(m.user_id, r)} testId="member-role-select" className="h-9 w-40 rounded-full" />
                <Button variant="ghost" size="icon" data-testid="member-remove-btn" title={t("remove")} onClick={() => remove(m.user_id)} className="text-destructive rounded-full">
                  <UserX className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
