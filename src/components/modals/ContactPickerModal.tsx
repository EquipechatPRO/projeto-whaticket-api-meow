import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Send, Search, User } from "lucide-react";
import { api, Contact } from "@/services/api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (contactJid: string, contactName: string) => void;
}

export default function ContactPickerModal({ open, onClose, onSend }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadContacts = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const data = await api.getContacts();
      setContacts(data);
      setLoaded(true);
    } catch {
      toast.error("Erro ao carregar contatos");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  if (!loaded && !loading) loadContacts();

  const filtered = contacts.filter((c) =>
    search ? c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) : true
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold text-sm text-foreground">Enviar Contato</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contato..."
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum contato encontrado</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.jid}
                onClick={() => { onSend(c.jid, c.name); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors border-b border-border/50"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{c.phone}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
