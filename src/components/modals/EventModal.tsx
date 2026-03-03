import { useState } from "react";
import { X, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (name: string, date: string, time: string, description: string) => void;
}

export default function EventModal({ open, onClose, onSend }: Props) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");

  if (!open) return null;

  const handleSend = () => {
    if (!name.trim() || !date) { toast.error("Preencha nome e data do evento"); return; }
    onSend(name.trim(), date, time, description.trim());
    setName(""); setDate(""); setTime(""); setDescription("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-foreground text-base">📅 Criar Evento</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Nome do evento *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Reunião de alinhamento"
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Data *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none border border-border focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Horário</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground outline-none border border-border focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do evento..." rows={3}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring resize-none" />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">Cancelar</button>
          <button onClick={handleSend} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Send className="w-3.5 h-3.5" /> Enviar evento
          </button>
        </div>
      </div>
    </div>
  );
}
