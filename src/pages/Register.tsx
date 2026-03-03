import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, ArrowRight, Building2 } from "lucide-react";
import { useAuth } from "@/stores/auth-store";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/translations";

export default function Register() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", password: "", companyName: "" });
  const [loading, setLoading] = useState(false);
  const register = useAuth((s) => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error(t("register.password_error"));
      return;
    }
    setLoading(true);
    const ok = await register(form);
    setLoading(false);
    if (ok) {
      toast.success(t("register.success"));
      navigate("/");
    }
  };

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">WhatsPanel</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{t("register.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("register.subtitle")}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t("register.company_name")}</label>
              <input type="text" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Minha Empresa Ltda" required className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t("register.your_name")}</label>
              <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="João Silva" required className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t("register.email")}</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="joao@empresa.com" required className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t("register.password")}</label>
              <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder={t("register.password_hint")} required className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring text-sm" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? t("register.registering") : t("register.submit")}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("register.has_account")}{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">{t("register.login")}</Link>
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { label: t("register.free"), desc: t("register.free_desc") },
            { label: t("register.no_card"), desc: t("register.no_card_desc") },
            { label: t("register.multi_agent"), desc: t("register.multi_agent_desc") },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-lg p-3">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
