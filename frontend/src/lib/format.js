export function formatBytes(b) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), 3);
  return `${(b / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export const dayKey = (iso) => (iso || "").slice(0, 10);

export function formatDay(key, locale) {
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "long" });
}

export function formatDateTime(iso, locale) {
  if (!iso) return "";
  const d = new Date(iso.length <= 19 ? iso : iso);
  return d.toLocaleString(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatTime(iso, locale) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export const placeLabel = (m) => [m.city, m.country].filter(Boolean).join(", ");

export function tripDays(media, startDate) {
  const keys = [...new Set(media.map((m) => dayKey(m.taken_at)))].sort();
  const base = startDate || keys[0];
  const dayNum = (k) => {
    if (!base) return 1;
    const diff = Math.round((new Date(k) - new Date(base)) / 86400000);
    return diff + 1;
  };
  return { keys, dayNum };
}

export const initials = (name) => (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
