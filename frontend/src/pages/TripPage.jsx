import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, UserPlus, MapPin, Images, Map as MapIcon, Users, Settings } from "lucide-react";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useUploadQueue } from "@/lib/uploadQueue";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Gallery from "@/components/Gallery";
import TripMap from "@/components/TripMap";
import MembersPanel from "@/components/MembersPanel";
import TripSettings from "@/components/TripSettings";
import UploadDialog from "@/components/UploadDialog";
import InviteDialog from "@/components/InviteDialog";
import ZipButton from "@/components/ZipButton";
import MediaLightbox from "@/components/MediaLightbox";

export default function TripPage() {
  const { tripId } = useParams();
  const api = useApi();
  const { t } = useI18n();
  const { queue } = useUploadQueue();
  const [trip, setTrip] = useState(null);
  const [media, setMedia] = useState([]);
  const [error, setError] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [tab, setTab] = useState("gallery");

  const load = useCallback(() => {
    api.get(`/trips/${tripId}`).then((r) => setTrip(r.data)).catch(() => setError(true));
    api.get(`/trips/${tripId}/media`).then((r) => setMedia(r.data)).catch(() => {});
  }, [api, tripId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const h = (e) => {
      if (e.detail.tripId !== tripId) return;
      setMedia((m) => (m.some((x) => x.id === e.detail.media.id) ? m : [...m, e.detail.media]));
    };
    window.addEventListener("tg:uploaded", h);
    return () => window.removeEventListener("tg:uploaded", h);
  }, [tripId]);

  const pendingHere = useMemo(() => queue.filter((q) => q.trip_id === tripId).length, [queue, tripId]);
  const updateMedia = (m) => setMedia((list) => list.map((x) => (x.id === m.id ? m : x)));
  const removeMedia = (id) => { setMedia((list) => list.filter((x) => x.id !== id)); setLightbox(null); };

  if (error) return <main className="max-w-7xl mx-auto px-6 py-20 text-center text-muted-foreground" data-testid="trip-not-found">{t("invite_invalid")} <Link to="/" className="underline">{t("back")}</Link></main>;
  if (!trip) return <main className="max-w-7xl mx-auto px-6 py-14"><div className="h-10 w-64 rounded-xl bg-muted animate-pulse" /></main>;

  const isOwner = trip.my_role === "owner";
  const canPost = trip.my_role !== "viewer";
  const tabs = [["gallery", Images, t("gallery")], ["map", MapIcon, t("map")], ["members", Users, t("members")]];
  if (isOwner) tabs.push(["settings", Settings, t("settings")]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-32">
      <Link to="/" data-testid="trip-back-link" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("my_trips")}</Link>
      <div className="mt-4 flex flex-col lg:flex-row lg:items-end gap-5 justify-between">
        <div className="fade-up">
          <h1 data-testid="trip-title" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">{trip.name}</h1>
          <p className="mt-2 text-xs font-mono uppercase tracking-widest text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            {trip.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{trip.location}</span>}
            <span>{trip.media_count} {t("media")}</span><span>{trip.member_count} {t("members")}</span>
            <span className="text-[hsl(var(--brand))]">{t(trip.my_role)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwner && <Button variant="outline" className="rounded-full" data-testid="invite-members-btn" onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4 mr-1.5" />{t("invite")}</Button>}
          <ZipButton tripId={tripId} disabled={!media.length} />
          {canPost && <Button className="rounded-full hidden sm:inline-flex" data-testid="upload-media-btn" onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4 mr-1.5" />{t("add_media")}{pendingHere > 0 && <span className="ml-2 font-mono text-xs opacity-70">({pendingHere} {t("queued")})</span>}</Button>}
        </div>
      </div>
      {!canPost && <p data-testid="viewer-notice" className="mt-4 text-sm text-muted-foreground">{t("viewer_notice")}</p>}

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList className="bg-transparent p-0 h-auto border-b w-full justify-start rounded-none gap-6 overflow-x-auto no-scrollbar">
          {tabs.map(([v, Icon, label]) => (
            <TabsTrigger key={v} value={v} data-testid={`trip-tab-${v}`}
              className="rounded-none px-0 pb-3 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-foreground gap-1.5">
              <Icon className="h-4 w-4" />{label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="gallery" className="mt-8">
          <Gallery media={media} trip={trip} onOpen={setLightbox} onTripChange={setTrip} />
        </TabsContent>
        <TabsContent value="map" className="mt-8">
          {tab === "map" && <TripMap media={media} onOpen={setLightbox} />}
        </TabsContent>
        <TabsContent value="members" className="mt-8">
          {tab === "members" && <MembersPanel trip={trip} />}
        </TabsContent>
        {isOwner && (
          <TabsContent value="settings" className="mt-8">
            <TripSettings trip={trip} onChange={setTrip} />
          </TabsContent>
        )}
      </Tabs>

      {canPost && (
        <button data-testid="upload-media-fab" onClick={() => setUploadOpen(true)}
          className="sm:hidden fixed bottom-6 right-5 z-40 h-14 w-14 rounded-full bg-foreground text-background shadow-xl grid place-items-center active:scale-95 transition-transform">
          <Plus className="h-6 w-6" />
        </button>
      )}
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} tripId={tripId} />
      {isOwner && <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} trip={trip} onChange={setTrip} />}
      <MediaLightbox media={media} current={lightbox} onNavigate={setLightbox} onClose={() => setLightbox(null)}
        trip={trip} onUpdated={updateMedia} onDeleted={removeMedia} onTripChange={setTrip} />
    </main>
  );
}
