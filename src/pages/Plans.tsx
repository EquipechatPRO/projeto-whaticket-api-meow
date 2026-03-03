import { useState } from "react";
import { Check, X, Zap, Crown, Building2, Rocket, ArrowRight, MessageCircle, Users, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth-store";
import { usePlanStore, type Plan as StorePlan } from "@/stores/plan-store";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type BillingCycle = "monthly" | "yearly";

const iconMap: Record<string, React.ElementType> = {
  free: Zap,
  starter: Rocket,
  professional: Crown,
  enterprise: Building2,
};

const colorMap: Record<string, string> = {
  free: "border-border",
  starter: "border-info",
  professional: "border-primary",
  enterprise: "border-warning",
};

function mapStorePlan(p: StorePlan, index: number) {
  const icon = iconMap[p.slug] || Package;
  const color = colorMap[p.slug] || "border-border";
  const popular = p.slug === "professional" || index === 2;
  return { ...p, icon, color, popular };
}

export default function Plans() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const { user } = useAuth();
  const { plans: storePlans } = usePlanStore();
  const currentPlan = user?.role === "super_admin" ? null : "free";

  const activePlans = storePlans.filter((p) => p.isActive);
  const displayPlans = activePlans.map(mapStorePlan);

  const handleSubscribe = (plan: StorePlan) => {
    if (plan.slug === "free" || plan.monthlyPrice === 0) {
      toast.info("Você já está no plano Free");
      return;
    }
    if (plan.slug === "enterprise") {
      toast.info("Nossa equipe entrará em contato em breve!");
      return;
    }
    toast.info(`Integração de pagamento será configurada em breve para o plano ${plan.name}`);
  };

  const fmt = (v: number) => (v < 0 ? "Ilimitado" : v.toLocaleString("pt-BR"));
  const yearlyMonthly = (p: StorePlan) => Math.round(p.yearlyPrice / 12);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm">WhatsPanel</span>
          </Link>
          {user ? (
            <Link to="/" className="text-sm text-primary hover:underline">Voltar ao painel</Link>
          ) : (
            <Link to="/login" className="text-sm text-primary hover:underline">Fazer login</Link>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Escolha o plano ideal para sua empresa
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Escale seu atendimento via WhatsApp com a plataforma certa. Cancele quando quiser.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                billing === "monthly" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors relative",
                billing === "yearly" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Anual
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className={cn(
          "grid grid-cols-1 gap-5 mb-16",
          displayPlans.length <= 2 ? "md:grid-cols-2 max-w-3xl mx-auto" :
          displayPlans.length === 3 ? "md:grid-cols-3 max-w-5xl mx-auto" :
          "md:grid-cols-2 lg:grid-cols-4"
        )}>
          {displayPlans.map((plan) => {
            const price = billing === "monthly" ? plan.monthlyPrice : yearlyMonthly(plan);
            const isCurrent = plan.slug === currentPlan;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative bg-card rounded-xl border-2 p-6 flex flex-col transition-shadow hover:shadow-lg",
                  plan.popular ? plan.color + " shadow-md" : plan.color
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    Mais popular
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", plan.popular ? "bg-primary/10" : "bg-muted")}>
                    <plan.icon className={cn("w-4 h-4", plan.popular ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{plan.name}</h3>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      {price === 0 ? "Grátis" : `R$${price}`}
                    </span>
                    {price > 0 && <span className="text-sm text-muted-foreground">/mês</span>}
                  </div>
                  {billing === "yearly" && price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      R${plan.yearlyPrice.toLocaleString("pt-BR")}/ano (economia de R${((plan.monthlyPrice * 12) - plan.yearlyPrice).toLocaleString("pt-BR")})
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrent}
                  className={cn(
                    "w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-opacity mb-5",
                    isCurrent
                      ? "bg-muted text-muted-foreground cursor-default"
                      : plan.popular
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "bg-secondary text-foreground hover:bg-accent"
                  )}
                >
                  {isCurrent ? "Plano atual" : price === 0 ? "Começar grátis" : `Assinar ${plan.name}`}
                  {!isCurrent && <ArrowRight className="w-4 h-4" />}
                </button>

                {/* Limits */}
                <div className="space-y-2 mb-4 pb-4 border-b border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Atendentes</span>
                    <span className="font-medium text-foreground">{fmt(plan.maxAgents)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />Filas</span>
                    <span className="font-medium text-foreground">{fmt(plan.maxQueues)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" />Contatos</span>
                    <span className="font-medium text-foreground">{fmt(plan.maxContacts)}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2 flex-1">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Comparação detalhada</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-1/5">Recurso</th>
                  {displayPlans.map((p) => (
                    <th key={p.id} className="text-center text-xs font-medium text-muted-foreground px-4 py-3">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-sm text-foreground">Preço mensal</td>
                  {displayPlans.map((p) => (
                    <td key={p.id} className="px-4 py-3 text-center text-sm font-medium text-foreground">
                      {p.monthlyPrice === 0 ? "Grátis" : `R$${p.monthlyPrice}`}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-sm text-foreground">Atendentes</td>
                  {displayPlans.map((p) => (
                    <td key={p.id} className="px-4 py-3 text-center text-sm font-medium text-foreground">{fmt(p.maxAgents)}</td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-sm text-foreground">Filas</td>
                  {displayPlans.map((p) => (
                    <td key={p.id} className="px-4 py-3 text-center text-sm font-medium text-foreground">{fmt(p.maxQueues)}</td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-3 text-sm text-foreground">Contatos</td>
                  {displayPlans.map((p) => (
                    <td key={p.id} className="px-4 py-3 text-center text-sm font-medium text-foreground">{fmt(p.maxContacts)}</td>
                  ))}
                </tr>
                {/* Feature rows - collect all unique features */}
                {Array.from(new Set(displayPlans.flatMap((p) => p.features))).map((feat) => (
                  <tr key={feat} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm text-foreground">{feat}</td>
                    {displayPlans.map((p) => (
                      <td key={p.id} className="px-4 py-3 text-center">
                        {p.features.includes(feat) ? (
                          <Check className="w-4 h-4 text-primary mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm">
            Dúvidas? Entre em contato pelo{" "}
            <button onClick={() => toast.info("Suporte em breve")} className="text-primary hover:underline">suporte</button>{" "}
            ou envie um e-mail para contato@whatspanel.com
          </p>
        </div>
      </div>
    </div>
  );
}
