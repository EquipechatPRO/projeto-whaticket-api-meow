import { useState } from "react";
import { X, Send, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (lat: number, lng: number, name?: string) => void;
}

export default function LocationModal({ open, onClose, onSend }: Props) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [name, setName] = useState("");
  const [detecting, setDetecting] = useState(false);

  if (!open) return null;

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setDetecting(false);
        toast.success("Localização detectada!");
      },
      () => {
        setDetecting(false);
        toast.error("Não foi possível detectar a localização");
      }
    );
  };

  const handleSend = () => {
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (isNaN(latN) || isNaN(lngN)) {
      toast.error("Informe latitude e longitude válidas");
      return;
    }
    onSend(latN, lngN, name || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-foreground text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Enviar Localização
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <button
            onClick={detectLocation}
            disabled={detecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" />
            {detecting ? "Detectando..." : "Usar minha localização"}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Latitude</label>
              <input type="text" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-23.550520"
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Longitude</label>
              <input type="text" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-46.633308"
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Nome do local (opcional)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Escritório central"
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring" />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">Cancelar</button>
          <button onClick={handleSend} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Send className="w-3.5 h-3.5" /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
