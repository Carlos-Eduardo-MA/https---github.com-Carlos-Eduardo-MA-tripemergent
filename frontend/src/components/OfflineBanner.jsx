import { CloudOff, RefreshCw } from "lucide-react";
import { useUploadQueue } from "@/lib/uploadQueue";
import { useI18n } from "@/lib/i18n";

export default function OfflineBanner() {
  const { queue, online, syncing, flush } = useUploadQueue();
  const { t } = useI18n();
  if (online && queue.length === 0) return null;
  return (
    <div data-testid="offline-status-indicator"
      className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border bg-card/95 backdrop-blur-xl shadow-lg px-4 py-2 text-sm fade-up">
      {!online ? <CloudOff className="h-4 w-4 text-[hsl(var(--amber))]" /> : <RefreshCw className={`h-4 w-4 text-[hsl(var(--brand))] ${syncing ? "animate-spin" : ""}`} />}
      <span>{!online ? t("offline_now") : t("syncing")}</span>
      {queue.length > 0 && (
        <span data-testid="offline-queue-count" className="font-mono text-xs rounded-full bg-muted px-2 py-0.5">{queue.length} {t("pending_uploads")}</span>
      )}
      {online && !syncing && queue.length > 0 && (
        <button data-testid="offline-retry-btn" onClick={flush} className="text-xs underline">↻</button>
      )}
    </div>
  );
}
