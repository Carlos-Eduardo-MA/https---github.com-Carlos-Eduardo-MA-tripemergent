import { useState } from "react";
import { FolderDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useApi, fileUrl, errMsg } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ZipButton({ tripId, disabled }) {
  const api = useApi();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const go = async (group) => {
    setBusy(true);
    toast(t("preparing_zip"));
    try {
      const { data } = await api.post(`/trips/${tripId}/zip-link`, { group });
      const a = document.createElement("a");
      a.href = fileUrl(data.url);
      a.click();
    } catch (e) {
      toast.error(errMsg(e, t("error")));
    } finally {
      setTimeout(() => setBusy(false), 3000);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full" disabled={disabled || busy} data-testid="batch-zip-download-btn">
          {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FolderDown className="h-4 w-4 mr-1.5" />}{t("download_all")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem data-testid="zip-by-day-option" onClick={() => go("day")}>{t("by_day")}</DropdownMenuItem>
        <DropdownMenuItem data-testid="zip-by-author-option" onClick={() => go("author")}>{t("by_author")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
