import { useState } from "react";
import { X, Send, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (question: string, options: string[]) => void;
}

export default function PollModal({ open, onClose, onSend }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  if (!open) return null;

  const addOption = () => {
    if (options.length >= 12) return;
    setOptions([...options, ""]);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const handleSend = () => {
    if (!question.trim()) { toast.error("Digite a pergunta"); return; }
    const valid = options.filter((o) => o.trim());
    if (valid.length < 2) { toast.error("Adicione pelo menos 2 opções"); return; }
    onSend(question.trim(), valid);
    setQuestion("");
    setOptions(["", ""]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-foreground text-base">📊 Criar Enquete</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Pergunta</label>
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Qual a melhor opção?"
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Opções</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }}
                    placeholder={`Opção ${i + 1}`}
                    className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:ring-1 focus:ring-ring"
                  />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(i)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 12 && (
              <button onClick={addOption} className="flex items-center gap-1 text-xs text-primary font-semibold mt-2 hover:underline">
                <Plus className="w-3 h-3" /> Adicionar opção
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors">Cancelar</button>
          <button onClick={handleSend} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Send className="w-3.5 h-3.5" /> Enviar enquete
          </button>
        </div>
      </div>
    </div>
  );
}
