import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Show, useAuth } from "@clerk/react";
import { Users, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useApi, errMsg } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";

function JoinSignedIn({ token }) {
  const api = useApi();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/invites/${token}`).then((r) => setInfo(r.data)).catch(() => setError(t("invite_invalid")));
  }, [api, token, t]);

  const join = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/invites/${token}/join`);
      navigate(`/trips/${data.trip_id}`, { replace: true });
    } catch (e) {
      toast.error(errMsg(e, t("error")));
      setBusy(false);
    }
  };

  if (error) return <p data-testid="join-error" className="text-muted-foreground">{error}</p>;
  if (!info) return <div className="h-40 w-full max-w-md rounded-3xl bg-muted animate-pulse" />;
  return (
    <div data-testid="join-card" className="w-full max-w-md rounded-3xl border bg-card p-8 fade-up">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">{t("join_title")}</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{info.name}</h1>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {info.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{info.location}</span>}
        <span className="flex items-center gap-1"><Users className="h-4 w-4" />{info.member_count} {t("members")}</span>
      </div>
      <div className="mt-6 flex items-center gap-3">
        {info.owner_avatar ? <img src={info.owner_avatar} alt="" className="h-9 w-9 rounded-full" /> : <span className="h-9 w-9 rounded-full bg-muted grid place-items-center text-xs">{initials(info.owner_name)}</span>}
        <div className="text-sm"><span className="text-muted-foreground">{t("invited_by")}</span> <b>{info.owner_name}</b></div>
      </div>
      {info.blocked ? (
        <p data-testid="join-revoked" className="mt-8 text-sm text-destructive">{t("revoked")}</p>
      ) : info.is_member ? (
        <Button asChild className="mt-8 w-full rounded-full h-11" data-testid="join-open-trip-btn"><Link to={`/trips/${info.trip_id}`}>{t("open_trip")}</Link></Button>
      ) : (
        <Button onClick={join} disabled={busy} className="mt-8 w-full rounded-full h-11" data-testid="join-trip-btn">{t("join_btn")}</Button>
      )}
    </div>
  );
}

function JoinSignedOut({ token }) {
  const { t } = useI18n();
  const { isLoaded } = useAuth();
  useEffect(() => { if (isLoaded) localStorage.setItem("tg_pending_invite", token); }, [isLoaded, token]);
  return (
    <div data-testid="join-signed-out" className="w-full max-w-md rounded-3xl border bg-card p-8 text-center fade-up">
      <ShieldCheck className="h-8 w-8 mx-auto text-[hsl(var(--brand))]" />
      <h1 className="mt-4 text-2xl font-bold">{t("join_title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("join_login")}</p>
      <div className="mt-6 flex gap-2 justify-center">
        <Button asChild className="rounded-full" data-testid="join-sign-in-btn"><Link to="/sign-in">{t("sign_in")}</Link></Button>
        <Button asChild variant="outline" className="rounded-full" data-testid="join-sign-up-btn"><Link to="/sign-up">{t("get_started")}</Link></Button>
      </div>
    </div>
  );
}

export default function JoinPage() {
  const { token } = useParams();
  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <Show when="signed-in"><JoinSignedIn token={token} /></Show>
      <Show when="signed-out"><JoinSignedOut token={token} /></Show>
    </main>
  );
}
