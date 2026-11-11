import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { get, set } from "idb-keyval";
import { toast } from "sonner";
import { useApi } from "./api";
import { useI18n } from "./i18n";

const KEY = "tg_upload_queue";
const QueueContext = createContext(null);

export function UploadQueueProvider({ children }) {
  const api = useApi();
  const { t } = useI18n();
  const [queue, setQueue] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);

  const persist = async (items) => {
    await set(KEY, items);
    setQueue(items);
  };

  const flush = useCallback(async () => {
    if (busy.current || !navigator.onLine) return;
    busy.current = true;
    setSyncing(true);
    let items = (await get(KEY)) || [];
    for (const item of [...items]) {
      if (!navigator.onLine) break;
      const fd = new FormData();
      fd.append("file", new File([item.blob], item.name, { type: item.type }));
      ["caption", "tags", "taken_at", "lat", "lng", "client_id"].forEach((k) => item[k] != null && fd.append(k, item[k]));
      try {
        const { data } = await api.post(`/trips/${item.trip_id}/media`, fd);
        items = items.filter((i) => i.client_id !== item.client_id);
        await persist(items);
        window.dispatchEvent(new CustomEvent("tg:uploaded", { detail: { tripId: item.trip_id, media: data } }));
      } catch (e) {
        const status = e?.response?.status;
        if (status && status >= 400 && status < 500 && status !== 401 && status !== 408) {
          items = items.filter((i) => i.client_id !== item.client_id);
          await persist(items);
          toast.error(`${item.name}: ${e.response.data?.detail || t("error")}`);
        } else break;
      }
    }
    busy.current = false;
    setSyncing(false);
  }, [api, t]);

  const enqueue = useCallback(async (entries) => {
    const items = ((await get(KEY)) || []).concat(entries);
    await persist(items);
    if (navigator.onLine) flush();
    else toast(t("queued_msg"));
  }, [flush, t]);

  useEffect(() => {
    get(KEY).then((items) => setQueue(items || []));
    const on = () => { setOnline(true); flush(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    flush();
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [flush]);

  return <QueueContext.Provider value={{ queue, online, syncing, enqueue, flush }}>{children}</QueueContext.Provider>;
}

export const useUploadQueue = () => useContext(QueueContext);
