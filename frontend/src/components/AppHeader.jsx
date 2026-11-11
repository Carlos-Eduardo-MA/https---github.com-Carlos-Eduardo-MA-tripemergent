import { Link } from "react-router-dom";
import { Show, UserButton } from "@clerk/react";
import { Moon, Sun, Images } from "lucide-react";
import { useAppTheme } from "@/lib/theme";
import { useI18n, LANGS } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default function AppHeader() {
  const { theme, toggle } = useAppTheme();
  const { lang, setLang, t } = useI18n();
  return (
    <header data-testid="app-header" className="sticky top-0 z-40 h-16 border-b bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center gap-3">
        <Link to="/" data-testid="header-logo-link" className="flex items-center gap-2 mr-auto">
          <span className="h-8 w-8 rounded-lg bg-foreground text-background grid place-items-center"><Images className="h-4 w-4" /></span>
          <span className="font-display font-bold text-lg tracking-tight">TripGallery</span>
        </Link>
        <div data-testid="language-switcher-select" className="flex items-center rounded-full border p-0.5 text-xs font-mono">
          {LANGS.map((l) => (
            <button key={l.code} data-testid={`language-option-${l.code}`} onClick={() => setLang(l.code)}
              className={`px-2.5 py-1 rounded-full transition-colors ${lang === l.code ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              {l.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon" data-testid="dark-mode-toggle-btn" aria-label={t("theme")} onClick={toggle} className="rounded-full">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Show when="signed-in"><UserButton /></Show>
        <Show when="signed-out">
          <Button asChild size="sm" className="rounded-full hidden sm:inline-flex" data-testid="header-sign-in-btn">
            <Link to="/sign-in">{t("sign_in")}</Link>
          </Button>
        </Show>
      </div>
    </header>
  );
}
