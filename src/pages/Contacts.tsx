import { useState, useEffect } from "react";
import api, { Contact } from "@/services/api";
import { Search, MessageSquare, Phone } from "lucide-react";
import { useTranslation } from "@/i18n/translations";

export default function Contacts() {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { api.getContacts().then(setContacts); }, []);

  const filtered = contacts.filter((c) =>
    search ? c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) : true
  );

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{t("contacts.title")}</h1>
      <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("contacts.search")} className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((contact) => (
          <div key={contact.jid} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className="w-10 h-10 rounded-full bg-whatsapp-light flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary">{contact.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{contact.name}</p>
              <p className="text-xs text-muted-foreground">{contact.phone}</p>
            </div>
            <div className="flex gap-1">
              <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground"><MessageSquare className="w-4 h-4" /></button>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground"><Phone className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
