import { useState } from "react";
import { X, Send, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  onSend: (amount: string, description: string, pixKey?: string) => void;
}

export default function PaymentModal({ open, title, onClose, onSend }: Props) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pixKey, setPixKey] = useState("");

  if (!open) return null;

  const handleSend = () => {
    if (!amount.trim()) { toast.error("Informe o valor"); return; }
    onSend(amount.trim(), description.trim(), pixKey.trim() || undefined);
    setAmount(""); setDescription(""); setPixKey("");
    onClose();
  };

  const isPix = title.toLowerCase().includes("pix");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-foreground text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> {title}
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Valor (R$) *</label>
            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100,00"
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring" />
          </div>
          {isPix && (
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Chave PIX</label>
              <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="email@exemplo.com"
                className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring" />
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Descrição</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do pagamento"
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
