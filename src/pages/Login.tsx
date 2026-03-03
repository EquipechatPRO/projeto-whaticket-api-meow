import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/stores/auth-store";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/translations";

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      toast.success(t("login.success"));
      navigate("/");
    } else {
      toast.error(t("login.error"));
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute rounded-full bg-primary-foreground" style={{ width: `${Math.random() * 200 + 50}px`, height: `${Math.random() * 200 + 50}px`, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: Math.random() * 0.3 }} />
          ))}
        </div>
        <div className="relative z-10 text-primary-foreground max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
              <MessageCircle className="w-7 h-7" />
            </div>
            <span className="text-3xl font-bold">WhatsPanel</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">{t("login.hero_title")}</h1>
          <p className="text-primary-foreground/80 text-lg">{t("login.hero_subtitle")}</p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-sm">
            {[t("login.feature_multi"), t("login.feature_queues"), t("login.feature_replies"), t("login.feature_reports")].map((f) => (
              <div key={f} className="flex items-center gap-2 bg-primary-foreground/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">WhatsPanel</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">{t("login.title")}</h2>
          <p className="text-muted-foreground mb-8">{t("login.subtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t("login.email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t("login.password")}</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring text-sm pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? t("login.logging_in") : t("login.submit")}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("login.no_account")}{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">{t("login.register")}</Link>
          </div>

          <div className="mt-8 p-4 rounded-lg bg-muted border border-border">
            <p className="text-xs font-medium text-foreground mb-2">{t("login.demo")}</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><span className="font-medium">Super Admin:</span> admin@whatspanel.com / admin123</p>
              <p><span className="font-medium">Admin:</span> carlos@techcorp.com / 123456</p>
              <p><span className="font-medium">{t("role.agent")}:</span> ana@techcorp.com / 123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
