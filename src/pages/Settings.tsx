import { useState } from "react";
import { useNotificationPrefs } from "@/stores/notification-store";
import { useSettingsStore, Theme, Language } from "@/stores/settings-store";
import { useAuth } from "@/stores/auth-store";
import {
  Bell, Volume2, VolumeX, Smartphone, MessageSquare,
  Sun, Moon, Monitor, Globe, User, Save, Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/translations";

const Toggle = ({ checked, onChange, label, description, icon: Icon }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string; icon: React.ElementType;
}) => (
  <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="w-4 h-4 text-primary" /></div>
      <div><p className="text-sm font-medium text-foreground">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>
    </div>
    <button onClick={() => onChange(!checked)} className={cn("relative w-11 h-6 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? "translateX(22px)" : "translateX(0)" }} />
    </button>
  </div>
);

const OptionGroup = <T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: React.ElementType; description?: string }[];
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
    {options.map((opt) => (
      <button key={opt.value} onClick={() => onChange(opt.value)} className={cn("flex items-center gap-2.5 p-3 rounded-lg border transition-all text-left", value === opt.value ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-muted-foreground/30")}>
        {opt.icon && <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", value === opt.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}><opt.icon className="w-4 h-4" /></div>}
        <div><p className={cn("text-sm font-medium", value === opt.value ? "text-primary" : "text-foreground")}>{opt.label}</p>{opt.description && <p className="text-[11px] text-muted-foreground">{opt.description}</p>}</div>
      </button>
    ))}
  </div>
);

const SectionCard = ({ title, subtitle, icon: Icon, children }: {
  title: string; subtitle: string; icon: React.ElementType; children: React.ReactNode;
}) => (
  <div className="bg-card border border-border rounded-xl p-5">
    <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2"><Icon className="w-4 h-4" /> {title}</h2>
    <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
    {children}
  </div>
);

export default function Settings() {
  const { t } = useTranslation();
  const { soundEnabled, soundVolume, pushEnabled, toastEnabled, setSoundEnabled, setSoundVolume, setPushEnabled, setToastEnabled } = useNotificationPrefs();
  const { theme, language, setTheme, setLanguage } = useSettingsStore();
  const { user } = useAuth();

  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [profileSaving, setProfileSaving] = useState(false);

  const testSound = () => {
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2LkZuWkIuGgX18fX+EiY2PkI+Oi4mHhYOBgICAgoSGiIqLjI2NjYyLioiHhYSDgoGBgYKDhIaHiImKi4uLi4qJiIeGhYSEg4KCgoKDhIWGh4iIiYmJiYiIh4aFhYSEg4ODg4OEhIWFhoaHh4eHh4eGhoaFhYWEhISDg4OEhIWFhYaGhoaGhoaGhYWFhYSEhISDg4OEhISFhYWFhYWFhYWFhYSEhISDg4OEhISEhYWFhYWFhQ==");
    audio.volume = soundVolume / 100;
    audio.play().catch(() => {});
    toast.info(t("settings.sound_test_msg"));
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setProfileSaving(false);
    toast.success(t("settings.profile_saved"));
  };

  const initials = (profileName || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const roleLabel = user?.role === "super_admin" ? t("role.super_admin") : user?.role === "company_admin" ? t("role.company_admin") : user?.role === "supervisor" ? t("role.supervisor") : t("role.agent");

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("settings.subtitle")}</p>
        </div>

        <SectionCard title={t("settings.profile")} subtitle={t("settings.profile_sub")} icon={User}>
          <div className="flex items-start gap-4 mb-5">
            <div className="relative group">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary border-2 border-primary/20">
                {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initials}
              </div>
              <button className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-4 h-4 text-white" /></button>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}{user?.companyName && ` • ${user.companyName}`}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t("settings.name")}</label><input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">{t("settings.email")}</label><input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <button onClick={handleSaveProfile} disabled={profileSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="w-3.5 h-3.5" />
              {profileSaving ? t("common.saving") : t("settings.save_changes")}
            </button>
          </div>
        </SectionCard>

        <SectionCard title={t("settings.appearance")} subtitle={t("settings.appearance_sub")} icon={Sun}>
          <OptionGroup<Theme> value={theme} onChange={setTheme} options={[
            { value: "light", label: t("settings.light"), icon: Sun, description: t("settings.light_desc") },
            { value: "dark", label: t("settings.dark"), icon: Moon, description: t("settings.dark_desc") },
            { value: "system", label: t("settings.system"), icon: Monitor, description: t("settings.system_desc") },
          ]} />
        </SectionCard>

        <SectionCard title={t("settings.language")} subtitle={t("settings.language_sub")} icon={Globe}>
          <OptionGroup<Language> value={language} onChange={(l) => {
            setLanguage(l);
            toast.success(l === "pt-BR" ? t("settings.lang_changed_pt") : l === "en" ? t("settings.lang_changed_en") : t("settings.lang_changed_es"));
          }} options={[
            { value: "pt-BR", label: "Português", description: "Brasil" },
            { value: "en", label: "English", description: "United States" },
            { value: "es", label: "Español", description: "Latinoamérica" },
          ]} />
        </SectionCard>

        <SectionCard title={t("settings.notifications")} subtitle={t("settings.notifications_sub")} icon={Bell}>
          <Toggle checked={soundEnabled} onChange={setSoundEnabled} label={t("settings.sound")} description={t("settings.sound_desc")} icon={soundEnabled ? Volume2 : VolumeX} />
          {soundEnabled && (
            <div className="py-4 border-b border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Volume2 className="w-4 h-4 text-primary" /></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1"><p className="text-sm font-medium text-foreground">{t("settings.volume")}</p><span className="text-xs font-semibold text-primary">{soundVolume}%</span></div>
                  <input type="range" min={0} max={100} value={soundVolume} onChange={(e) => setSoundVolume(Number(e.target.value))} className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
                </div>
              </div>
              <button onClick={testSound} className="ml-12 text-xs text-primary hover:underline">{t("settings.test_sound")}</button>
            </div>
          )}
          <Toggle checked={toastEnabled} onChange={setToastEnabled} label={t("settings.toast")} description={t("settings.toast_desc")} icon={MessageSquare} />
          <Toggle checked={pushEnabled} onChange={setPushEnabled} label={t("settings.push")} description={t("settings.push_desc")} icon={Smartphone} />
        </SectionCard>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-2">{t("settings.summary")}</h2>
          <div className="space-y-2">
            {[
              { label: t("settings.theme"), value: theme === "light" ? t("settings.light") : theme === "dark" ? t("settings.dark") : t("settings.system") },
              { label: t("settings.language"), value: language === "pt-BR" ? "Português" : language === "en" ? "English" : "Español" },
              { label: t("settings.sound"), value: soundEnabled ? `${t("settings.enabled")} (${soundVolume}%)` : t("settings.disabled") },
              { label: "Toast", value: toastEnabled ? t("settings.enabled") : t("settings.disabled") },
              { label: "Push", value: pushEnabled ? t("settings.enabled") : t("settings.disabled") },
              { label: t("settings.push_permission"), value: "Notification" in window ? Notification.permission : t("settings.unavailable") },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
