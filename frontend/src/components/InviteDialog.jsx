import { QRCodeSVG } from "qrcode.react";
import { Copy, RefreshCw, Lock } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function InviteDialog({ open, onOpenChange, trip, onChange }) {
  const api = useApi();
  const { t } = useI18n();
  const link = `${window.location.origin}/join/${trip.invite_token}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch {}
    toast.success(t("copied"));
  };
  const regen = async () => {
    if (!window.confirm(t("regenerate_d"))) return;
    const { data } = await api.post(`/trips/${trip.id}/invite/regenerate`);
    onChange({ ...trip, invite_token: data.invite_token });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="invite-modal" className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("invite_title")}</DialogTitle>
          <DialogDescription className="flex items-start gap-1.5"><Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />{t("invite_d")}</DialogDescription>
        </DialogHeader>
        {!trip.invite_enabled && <p className="text-sm text-destructive" data-testid="invite-disabled-note">{t("invite_disabled")}</p>}
        <div data-testid="invite-qr-code" className="mx-auto rounded-2xl bg-white p-5 border">
          <QRCodeSVG value={link} size={200} level="M" />
        </div>
        <div className="flex items-center gap-2 rounded-full border pl-4 pr-1 py-1">
          <span data-testid="invite-link-text" className="truncate text-xs font-mono flex-1">{link}</span>
          <Button size="sm" className="rounded-full" data-testid="invite-link-copy-btn" onClick={copy}><Copy className="h-3.5 w-3.5 mr-1" />{t("copy_link")}</Button>
        </div>
        <button data-testid="invite-regenerate-btn" onClick={regen} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto">
          <RefreshCw className="h-3 w-3" />{t("regenerate")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
