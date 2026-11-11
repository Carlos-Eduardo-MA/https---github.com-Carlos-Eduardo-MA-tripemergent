import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Plane } from "lucide-react";
import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TripCard from "@/components/TripCard";
import CreateTripDialog from "@/components/CreateTripDialog";

export default function Dashboard() {
  const api = useApi();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [trips, setTrips] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const pending = localStorage.getItem("tg_pending_invite");
    if (pending) {
      localStorage.removeItem("tg_pending_invite");
      navigate(`/join/${pending}`, { replace: true });
      return;
    }
    api.get("/trips").then((r) => setTrips(r.data)).catch(() => setTrips([]));
  }, [api, navigate]);

  return (
    <main data-testid="trips-dashboard-view" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">TripGallery</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">{t("my_trips")}</h1>
        </div>
        <Button data-testid="create-trip-btn" onClick={() => setOpen(true)} className="rounded-full h-11 px-5">
          <Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">{t("new_trip")}</span>
        </Button>
      </div>
      {trips === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>
      ) : trips.length === 0 ? (
        <div data-testid="trips-empty-state" className="rounded-3xl border border-dashed py-20 text-center">
          <Plane className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">{t("no_trips")}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{t("no_trips_d")}</p>
          <Button className="mt-6 rounded-full" onClick={() => setOpen(true)} data-testid="empty-create-trip-btn"><Plus className="h-4 w-4 mr-1" />{t("new_trip")}</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip, i) => <TripCard key={trip.id} trip={trip} index={i} />)}
        </div>
      )}
      <CreateTripDialog open={open} onOpenChange={setOpen} onCreated={(trip) => navigate(`/trips/${trip.id}`)} />
    </main>
  );
}
