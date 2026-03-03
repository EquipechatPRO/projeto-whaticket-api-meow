import { cn } from "@/lib/utils";
import { Zap, X } from "lucide-react";
import { useQuickReplyStore, QuickReply } from "@/stores/quick-reply-store";

export type { QuickReply } from "@/stores/quick-reply-store";

interface QuickReplyListProps {
  filter: string;
  onSelect: (reply: QuickReply) => void;
  onClose: () => void;
}

export function QuickReplyList({ filter, onSelect, onClose }: QuickReplyListProps) {
  const replies = useQuickReplyStore((s) => s.replies);

  const filtered = replies.filter((r) => {
    const q = filter.toLowerCase();
    return (
      r.shortcut.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.text.toLowerCase().includes(q)
    );
  });

  const grouped = filtered.reduce<Record<string, QuickReply[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  if (filtered.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-xl z-20 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Respostas Rápidas
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhuma resposta encontrada para "{filter}"
        </p>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-xl z-20 max-h-[300px] overflow-y-auto scrollbar-thin">
      <div className="sticky top-0 bg-card border-b border-border px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-primary" /> Respostas Rápidas
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <div className="px-3 py-1.5 bg-muted/50">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{cat}</span>
          </div>
          {items.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                  /{r.shortcut}
                </span>
                <span className="text-xs font-semibold text-foreground">{r.title}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{r.text}</p>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
