import { useNotificationPrefs } from "@/stores/notification-store";
import { Bell, Volume2, VolumeX, Smartphone, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Toggle = ({ checked, onChange, label, description, icon: Icon }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string; icon: React.ElementType;
}) => (
  <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span className={cn(
        "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-5.5 left-0.5" : "left-0.5"
      )} style={{ transform: checked ? "translateX(22px)" : "translateX(0)" }} />
    </button>
  </div>
);

export default function Settings() {
  const {
    soundEnabled, soundVolume, pushEnabled, toastEnabled,
    setSoundEnabled, setSoundVolume, setPushEnabled, setToastEnabled,
  } = useNotificationPrefs();

  const testSound = () => {
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2LkZuWkIuGgX18fX+EiY2PkI+Oi4mHhYOBgICAgoSGiIqLjI2NjYyLioiHhYSDgoGBgYKDhIaHiImKi4uLi4qJiIeGhYSEg4KCgoKDhIWGh4iIiYmJiYiIh4aFhYSEg4ODg4OEhIWFhoaHh4eHh4eGhoaFhYWEhISDg4OEhIWFhYaGhoaGhoaGhYWFhYSEhISDg4OEhISFhYWFhYWFhYWFhYSEhISDg4OEhISEhYWFhYWFhQ==");
    audio.volume = soundVolume / 100;
    audio.play().catch(() => {});
    toast.info("🔊 Som de teste reproduzido");
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Configurações</h1>
          <p className="text-xs text-muted-foreground">Preferências de notificação e alertas</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notificações
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Configure como você recebe alertas de novas mensagens</p>

          <Toggle
            checked={soundEnabled}
            onChange={setSoundEnabled}
            label="Som de notificação"
            description="Reproduzir som ao receber novas mensagens"
            icon={soundEnabled ? Volume2 : VolumeX}
          />

          {soundEnabled && (
            <div className="py-4 border-b border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">Volume</p>
                    <span className="text-xs font-semibold text-primary">{soundVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
              <button
                onClick={testSound}
                className="ml-12 text-xs text-primary hover:underline"
              >
                Testar som
              </button>
            </div>
          )}

          <Toggle
            checked={toastEnabled}
            onChange={setToastEnabled}
            label="Notificações visuais (toast)"
            description="Exibir banners flutuantes no canto da tela"
            icon={MessageSquare}
          />

          <Toggle
            checked={pushEnabled}
            onChange={setPushEnabled}
            label="Push do navegador"
            description="Notificações nativas mesmo com a aba em segundo plano"
            icon={Smartphone}
          />
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-2">Status atual</h2>
          <div className="space-y-2">
            {[
              { label: "Som", value: soundEnabled ? `Ativado (${soundVolume}%)` : "Desativado" },
              { label: "Toast", value: toastEnabled ? "Ativado" : "Desativado" },
              { label: "Push", value: pushEnabled ? "Ativado" : "Desativado" },
              { label: "Permissão push", value: "Notification" in window ? Notification.permission : "Indisponível" },
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
