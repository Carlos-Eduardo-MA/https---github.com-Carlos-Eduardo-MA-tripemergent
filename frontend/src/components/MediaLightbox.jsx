import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Languages, Trash2, Pencil, ImageIcon, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/react";
import { useApi, fileUrl, errMsg } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatBytes, formatDateTime, placeLabel } from "@/lib/format";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/MediaCard";

function Row({ label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

export default function MediaLightbox({ media, current, onNavigate, onClose, trip, onUpdated, onDeleted, onTripChange }) {
  const api = useApi();
  const { user } = useUser();
  const { t, lang, locale } = useI18n();
  const idx = media.findIndex((m) => m.id === current);
  const m = media[idx];
  const [tr, setTr] = useState(null);
  const [editing, setEditing] = useState(false);
  const [cap, setCap] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setTr(null); setEditing(false); }, [current, lang]);
  useEffect(() => {
    const k = (e) => {
      if (!m || editing) return;
      if (e.key === "ArrowRight" && idx < media.length - 1) onNavigate(media[idx + 1].id);
      if (e.key === "ArrowLeft" && idx > 0) onNavigate(media[idx - 1].id);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [m, idx, media, onNavigate, editing]);

  if (!m) return <Dialog open={false} />;
  const canEdit = m.uploader_id === user?.id || trip.my_role === "owner";

  const translate = async () => {
    setBusy(true);
    try { setTr((await api.post(`/media/${m.id}/translate`, { lang })).data); }
    catch (e) { toast.error(errMsg(e, t("error"))); }
    finally { setBusy(false); }
  };
  const save = async () => {
    try {
      const { data } = await api.patch(`/media/${m.id}`, { caption: cap, tags: tags.split(",") });
      onUpdated(data); setEditing(false); toast.success(t("saved"));
    } catch (e) { toast.error(errMsg(e, t("error"))); }
  };
  const del = async () => {
    if (!window.confirm(`${t("delete")}?`)) return;
    try { await api.delete(`/media/${m.id}`); onDeleted(m.id); } catch (e) { toast.error(errMsg(e, t("error"))); }
  };
  const setCover = async () => {
    try { onTripChange((await api.patch(`/trips/${trip.id}`, { cover_media_id: m.id })).data); toast.success(t("saved")); }
    catch { toast.error(t("error")); }
  };

  const caption = tr ? tr.caption : m.caption;
  const shownTags = tr ? tr.tags : m.tags;

  return (
    <Dialog open={!!m} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="media-lightbox-modal" className="max-w-6xl w-[96vw] p-0 overflow-hidden rounded-3xl gap-0 grid lg:grid-cols-[1fr_360px] max-h-[92vh]">
        <DialogTitle className="sr-only">{m.filename}</DialogTitle>
        <div className="relative bg-black flex items-center justify-center min-h-[40vh] lg:min-h-[80vh]">
          {m.media_type === "video"
            ? <video data-testid="lightbox-video" src={fileUrl(m.original_url)} controls playsInline className="max-h-[60vh] lg:max-h-[88vh] w-full" />
            : <img data-testid="lightbox-image" src={fileUrl(m.original_url)} alt={m.caption} className="max-h-[60vh] lg:max-h-[88vh] w-auto object-contain" />}
          {idx > 0 && <button data-testid="lightbox-prev-btn" onClick={() => onNavigate(media[idx - 1].id)} className="absolute left-3 h-10 w-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur text-white grid place-items-center"><ChevronLeft /></button>}
          {idx < media.length - 1 && <button data-testid="lightbox-next-btn" onClick={() => onNavigate(media[idx + 1].id)} className="absolute right-3 h-10 w-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur text-white grid place-items-center"><ChevronRight /></button>}
        </div>
        <aside className="p-6 overflow-y-auto max-h-[40vh] lg:max-h-[92vh]">
          <div className="flex items-center gap-3">
            <Avatar src={m.uploader_avatar} name={m.uploader_name} className="h-10 w-10" />
            <div>
              <p className="text-xs text-muted-foreground">{t("uploaded_by")}</p>
              <p data-testid="lightbox-uploader-name" className="font-semibold">{m.uploader_name}</p>
            </div>
          </div>
          <p className="mt-4 text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            {formatDateTime(m.taken_at, locale)}{placeLabel(m) && <> · <MapPin className="h-3 w-3" />{placeLabel(m)}</>}
          </p>

          {editing ? (
            <div className="mt-5 space-y-2">
              <Textarea data-testid="lightbox-caption-input" value={cap} onChange={(e) => setCap(e.target.value)} placeholder={t("caption_ph")} rows={3} />
              <Input data-testid="lightbox-tags-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("tags_ph")} />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t("cancel")}</Button>
                <Button size="sm" data-testid="lightbox-save-btn" onClick={save}>{t("save")}</Button>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              {caption && <p data-testid="lightbox-caption" className="text-base leading-relaxed">{caption}</p>}
              {shownTags?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{shownTags.map((x) => <span key={x} className="text-xs font-mono rounded-full bg-muted px-2.5 py-1">#{x}</span>)}</div>}
              {(m.caption || m.tags?.length > 0) && (
                <button data-testid="lightbox-translate-btn" disabled={busy} onClick={() => (tr ? setTr(null) : translate())}
                  className="mt-3 text-xs flex items-center gap-1 text-[hsl(var(--brand))] hover:underline disabled:opacity-50">
                  <Languages className="h-3.5 w-3.5" />{busy ? "..." : tr ? t("show_original") : t("translate")}
                </button>
              )}
            </div>
          )}

          <div data-testid="media-exif-details" className="mt-6 rounded-2xl border px-4 py-1">
            <Row label={t("taken")} value={formatDateTime(m.taken_at, locale)} />
            <Row label={t("location")} value={placeLabel(m)} />
            <Row label={t("coords")} value={m.lat != null ? `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}` : null} mono />
            <Row label={t("camera")} value={m.camera} />
            <Row label={t("resolution")} value={m.width ? `${m.width} × ${m.height}` : null} mono />
            <Row label={t("size")} value={formatBytes(m.size)} mono />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild className="rounded-full" data-testid="download-original-btn">
              <a href={fileUrl(m.download_url)} download={m.filename}><Download className="h-4 w-4 mr-1.5" />{t("download_original")}</a>
            </Button>
            {canEdit && !editing && <Button variant="outline" size="icon" className="rounded-full" data-testid="lightbox-edit-btn" onClick={() => { setCap(m.caption || ""); setTags((m.tags || []).join(", ")); setEditing(true); }}><Pencil className="h-4 w-4" /></Button>}
            {trip.my_role === "owner" && m.media_type === "image" && <Button variant="outline" size="icon" className="rounded-full" title={t("set_cover")} data-testid="lightbox-set-cover-btn" onClick={setCover}><ImageIcon className="h-4 w-4" /></Button>}
            {canEdit && <Button variant="outline" size="icon" className="rounded-full text-destructive" data-testid="lightbox-delete-btn" onClick={del}><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </aside>
      </DialogContent>
    </Dialog>
  );
}
