import { useState } from "react";
import exifr from "exifr";
import { ImagePlus, Camera, MapPin, Clock, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useUploadQueue } from "@/lib/uploadQueue";
import { formatBytes, formatDateTime } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

async function readMeta(file) {
  const fallback = new Date(file.lastModified).toISOString();
  if (!file.type.startsWith("image/")) return { taken_at: fallback };
  try {
    const d = await exifr.parse(file, { gps: true, pick: ["DateTimeOriginal", "CreateDate", "latitude", "longitude"] });
    const dt = d?.DateTimeOriginal || d?.CreateDate;
    return { taken_at: dt ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 19) : fallback, lat: d?.latitude, lng: d?.longitude, exif: !!dt };
  } catch {
    return { taken_at: fallback };
  }
}

export default function UploadDialog({ open, onOpenChange, tripId }) {
  const { t, locale } = useI18n();
  const { enqueue, online } = useUploadQueue();
  const [items, setItems] = useState([]);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");

  const pick = async (e) => {
    const files = [...e.target.files].filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    e.target.value = "";
    const metas = await Promise.all(files.map(readMeta));
    setItems((cur) => [...cur, ...files.map((file, i) => ({ file, meta: metas[i], preview: URL.createObjectURL(file) }))]);
  };

  const send = async () => {
    const entries = items.map(({ file, meta }) => ({
      client_id: crypto.randomUUID(), trip_id: tripId, blob: file, name: file.name, type: file.type,
      caption, tags, taken_at: meta.taken_at, lat: meta.lat ?? null, lng: meta.lng ?? null,
    }));
    items.forEach((i) => URL.revokeObjectURL(i.preview));
    setItems([]); setCaption(""); setTags("");
    onOpenChange(false);
    await enqueue(entries);
  };

  const remove = (i) => setItems(items.filter((_, j) => j !== i));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="upload-dialog-modal" className="rounded-3xl max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">{t("upload_title")}</DialogTitle></DialogHeader>
        {!online && <p data-testid="upload-offline-note" className="text-sm rounded-xl bg-[hsl(var(--amber)/0.12)] text-[hsl(var(--amber))] px-3 py-2">{t("offline_now")} — {t("queued_msg")}</p>}
        <div className="grid grid-cols-2 gap-3">
          <label data-testid="upload-choose-files" className="cursor-pointer rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-2 text-sm hover:bg-muted transition-colors">
            <ImagePlus className="h-6 w-6" />{t("choose_files")}
            <input data-testid="upload-file-input" type="file" accept="image/*,video/*" multiple hidden onChange={pick} />
          </label>
          <label data-testid="upload-take-photo" className="cursor-pointer rounded-2xl border-2 border-dashed p-6 flex flex-col items-center gap-2 text-sm hover:bg-muted transition-colors">
            <Camera className="h-6 w-6" />{t("take_photo")}
            <input type="file" accept="image/*,video/*" capture="environment" hidden onChange={pick} />
          </label>
        </div>
        {items.length > 0 && (
          <>
            <p className="text-xs font-mono text-muted-foreground">{items.length} {t("files_selected")}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.map(({ file, meta, preview }, i) => (
                <div key={preview} data-testid="upload-preview-item" className="flex items-center gap-3 rounded-xl border p-2">
                  {file.type.startsWith("image/") ? <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <video src={preview} className="h-12 w-12 rounded-lg object-cover" muted />}
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="font-mono text-muted-foreground flex flex-wrap gap-x-3">
                      <span>{formatBytes(file.size)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTime(meta.taken_at, locale)}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{meta.lat != null ? `${meta.lat.toFixed(3)}, ${meta.lng.toFixed(3)}` : t("no_gps")}</span>
                    </p>
                  </div>
                  <button onClick={() => remove(i)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <Textarea data-testid="upload-caption-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("caption_ph")} rows={2} />
            <Input data-testid="upload-tags-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={`${t("tags")}: ${t("tags_ph")}`} />
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button data-testid="upload-submit-btn" disabled={!items.length} onClick={send} className="rounded-full px-6">{t("send")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
