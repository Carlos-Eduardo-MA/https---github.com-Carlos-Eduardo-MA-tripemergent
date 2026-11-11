import { Link } from "react-router-dom";
import { ArrowRight, Lock, MapPin, CloudOff, FolderDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const HERO = "https://images.pexels.com/photos/2422018/pexels-photo-2422018.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const SIDE = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?crop=entropy&cs=srgb&fm=jpg&q=70&w=600",
  "https://images.unsplash.com/photo-1695206597675-eff02e38f746?crop=entropy&cs=srgb&fm=jpg&q=70&w=600",
];

export default function Landing() {
  const { t } = useI18n();
  const feats = [
    [Lock, "feat_private"], [MapPin, "feat_exif"], [CloudOff, "feat_offline"], [FolderDown, "feat_zip"],
  ];
  return (
    <main data-testid="landing-page" className="max-w-7xl mx-auto px-4 sm:px-6">
      <section className="grid lg:grid-cols-12 gap-10 lg:gap-14 pt-12 sm:pt-20 pb-16">
        <div className="lg:col-span-6 flex flex-col justify-center fade-up">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-6">{t("tagline")}</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.02]">{t("hero_title")}</h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">{t("hero_sub")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full h-12 px-7 group" data-testid="landing-get-started-btn">
              <Link to="/sign-up">{t("get_started")} <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-7" data-testid="landing-sign-in-btn">
              <Link to="/sign-in">{t("sign_in")}</Link>
            </Button>
          </div>
        </div>
        <div className="lg:col-span-6 grid grid-cols-5 gap-3 h-[420px] sm:h-[520px] fade-up" style={{ animationDelay: ".15s" }}>
          <div className="col-span-3 relative rounded-3xl overflow-hidden grain">
            <img src={HERO} alt="" className="h-full w-full object-cover" />
            <div className="absolute bottom-4 left-4 rounded-full bg-white/90 text-slate-900 px-3 py-1.5 text-xs font-mono flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> 40.6331° N, 14.6028° E
            </div>
          </div>
          <div className="col-span-2 grid grid-rows-2 gap-3">
            {SIDE.map((s) => <img key={s} src={s} alt="" className="h-full w-full object-cover rounded-3xl" />)}
          </div>
        </div>
      </section>
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 border-t">
        {feats.map(([Icon, k], i) => (
          <div key={k} className={`py-10 sm:px-6 ${i ? "lg:border-l" : ""} fade-up`} style={{ animationDelay: `${0.1 * i + 0.2}s` }}>
            <Icon className="h-5 w-5 mb-5 text-[hsl(var(--brand))]" />
            <h3 className="font-semibold text-lg">{t(k)}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(`${k}_d`)}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
