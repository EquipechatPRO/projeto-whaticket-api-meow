import { useState } from "react";
import { Check, X, Zap, Crown, Building2, Rocket, ArrowRight, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth-store";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type BillingCycle = "monthly" | "yearly";

interface Plan {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
  features: Record<string, string | boolean>;
  cta: string;
  color: string;
}

const featureLabels: Record<string, string> = {
  agents: "Atendentes",
  conversations: "Conversas/mês",
  queues: "Filas de atendimento",
  quickReplies: "Respostas rápidas",
  chatbot: "Chatbot automático",
  api: "Acesso à API",
  reports: "Relatórios avançados",
  multiChannel: "Multi-canal",
  customBranding: "Marca personalizada",
  prioritySupport: "Suporte prioritário",
  sla: "SLA garantido",
  dedicatedManager: "Gerente dedicado",
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    icon: Zap,
    description: "Para testar a plataforma",
    monthlyPrice: 0,
    yearlyPrice: 0,
    color: "border-border",
    cta: "Começar grátis",
    features: {
      agents: "2",
      conversations: "100",
      queues: "1",
      quickReplies: "10",
      chatbot: false,
      api: false,
      reports: false,
      multiChannel: false,
      customBranding: false,
      prioritySupport: false,
      sla: false,
      dedicatedManager: false,
    },
  },
  {
    id: "starter",
    name: "Starter",
    icon: Rocket,
    description: "Para pequenas equipes",
    monthlyPrice: 97,
    yearlyPrice: 79,
    color: "border-info",
    cta: "Assinar Starter",
    features: {
      agents: "5",
      conversations: "1.000",
      queues: "3",
      quickReplies: "50",
      chatbot: true,
      api: false,
      reports: false,
      multiChannel: false,
      customBranding: false,
      prioritySupport: false,
      sla: false,
      dedicatedManager: false,
    },
  },
  {
    id: "professional",
    name: "Professional",
    icon: Crown,
    description: "Para empresas em crescimento",
    monthlyPrice: 197,
    yearlyPrice: 167,
    popular: true,
    color: "border-primary",
    cta: "Assinar Professional",
    features: {
      agents: "20",
      conversations: "10.000",
      queues: "10",
      quickReplies: "Ilimitado",
      chatbot: true,
      api: true,
      reports: true,
      multiChannel: true,
      customBranding: true,
      prioritySupport: false,
      sla: false,
      dedicatedManager: false,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Building2,
    description: "Para grandes operações",
    monthlyPrice: 497,
    yearlyPrice: 417,
    color: "border-warning",
    cta: "Falar com vendas",
    features: {
      agents: "Ilimitado",
      conversations: "Ilimitado",
      queues: "Ilimitado",
      quickReplies: "Ilimitado",
      chatbot: true,
      api: true,
      reports: true,
      multiChannel: true,
      customBranding: true,
      prioritySupport: true,
      sla: true,
      dedicatedManager: true,
    },
  },
];

export default function Plans() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const { user } = useAuth();
  const currentPlan = user?.role === "super_admin" ? null : "free";

  const handleSubscribe = (plan: Plan) => {
    if (plan.id === "free") {
      toast.info("Você já está no plano Free");
      return;
    }
    if (plan.id === "enterprise") {
      toast.info("Nossa equipe entrará em contato em breve!");
      return;
    }
    toast.info(`Integração de pagamento será configurada em breve para o plano ${plan.name}`);
  };

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
            <Link to="/" className="text-sm text-primary hover:underline">
              Voltar ao painel
            </Link>
          ) : (
            <Link to="/login" className="text-sm text-primary hover:underline">
              Fazer login
            </Link>
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
                billing === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors relative",
                billing === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {plans.map((plan) => {
            const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
            const isCurrent = plan.id === currentPlan;

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
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    plan.popular ? "bg-primary/10" : "bg-muted"
                  )}>
                    <plan.icon className={cn("w-4 h-4", plan.popular ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
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
                      R${price * 12}/ano (economia de R${(plan.monthlyPrice - price) * 12})
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
                  {isCurrent ? "Plano atual" : plan.cta}
                  {!isCurrent && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="space-y-2.5 flex-1">
                  {Object.entries(plan.features).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {value === false ? (
                        <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      <span className={cn(value === false ? "text-muted-foreground/50" : "text-foreground")}>
                        {featureLabels[key]}
                        {typeof value === "string" && (
                          <span className="text-muted-foreground ml-1">({value})</span>
                        )}
                      </span>
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
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-1/5">Feature</th>
                  {plans.map((p) => (
                    <th key={p.id} className="text-center text-xs font-medium text-muted-foreground px-4 py-3">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(featureLabels).map(([key, label]) => (
                  <tr key={key} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm text-foreground">{label}</td>
                    {plans.map((p) => {
                      const val = p.features[key];
                      return (
                        <td key={p.id} className="px-4 py-3 text-center">
                          {val === false ? (
                            <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                          ) : val === true ? (
                            <Check className="w-4 h-4 text-primary mx-auto" />
                          ) : (
                            <span className="text-sm font-medium text-foreground">{val}</span>
                          )}
                        </td>
                      );
                    })}
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
            <button onClick={() => toast.info("Suporte em breve")} className="text-primary hover:underline">
              suporte
            </button>{" "}
            ou envie um e-mail para contato@whatspanel.com
          </p>
        </div>
      </div>
    </div>
  );
}
