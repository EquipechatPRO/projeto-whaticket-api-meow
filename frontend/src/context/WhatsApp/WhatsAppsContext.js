import React, { createContext, useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import api from "../../services/api";
import useWhatsApps from "../../hooks/useWhatsApps";
import WavoipPhoneWidget from "../../components/WavoipCall";
import { AuthContext } from "../Auth/AuthContext";

const WhatsAppsContext = createContext();

const WhatsAppsProvider = ({ children }) => {
  // Add fallback values to prevent destructuring errors
  const whatsAppData = useWhatsApps();
  const { loading = false, whatsApps = [], refetch } = whatsAppData || {};
  const { user, socket } = useContext(AuthContext);
  
  const [wavoipToken, setWavoipToken] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await api.get("/call/historical/user/whatsapp");

        // let wavoipToken  = "";
        // for(const d of data){
        //   if(d?.wavoip){
        //     wavoipToken = d.wavoip;
        //     break;
        //   }
        // }
        console.log('whavoip token', data)
        setWavoipToken(data?.whatsapp?.wavoip || null);
      } catch (err) {
        console.error("Erro fetchSession:", err);
        setWavoipToken(null);
      } finally {
        setLoadingSession(false);
      }
    };
    fetchSession();
  }, []);

  // Listener global para notificações de mudança de status de templates
  useEffect(() => {
    if (!user?.companyId || !socket || typeof socket.on !== 'function') return;

    const companyId = user.companyId;
    const eventName = `company-${companyId}-templateStatus`;

    const onTemplateStatusChange = (data) => {
      if (data.action === "statusChange" && data.changes) {
        data.changes.forEach(change => {
          if (change.newStatus === "APPROVED") {
            toast.success(`🎉 Template "${change.name}" aprovado pela Meta!`, { autoClose: 8000 });
          } else if (change.newStatus === "REJECTED") {
            toast.error(`❌ Template "${change.name}" rejeitado pela Meta`, { autoClose: 10000 });
          } else {
            toast.info(`Template "${change.name}": ${change.oldStatus} → ${change.newStatus}`, { autoClose: 6000 });
          }
        });
      }
    };

    socket.on(eventName, onTemplateStatusChange);
    return () => {
      if (socket && typeof socket.off === 'function') {
        socket.off(eventName, onTemplateStatusChange);
      }
    };
  }, [socket, user?.companyId]);

  // Log error state for debugging
  if (error) {
    console.warn("WhatsAppsProvider error:", error);
  }

  return (
    <WhatsAppsContext.Provider value={{ whatsApps, loading, error, refetch }}>
      {children}
      {wavoipToken && (
        <WavoipPhoneWidget
          token={wavoipToken}
          position="bottom-right"
          name={user?.company?.name || "waVoip"}
          country="BR"
          autoConnect={true}
          onCallStarted={(data) => console.log("Chamada iniciada:", data)}
          onCallEnded={(data) => console.log("Chamada finalizada:", data)}
          onConnectionStatus={(status) => console.log("Status:", status)}
          onError={(error) => console.error("Erro:", error)}
        />
      )}
    </WhatsAppsContext.Provider>
  );
};

export { WhatsAppsContext, WhatsAppsProvider };