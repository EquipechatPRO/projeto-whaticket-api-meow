import React, { useEffect, useState, useContext, useCallback } from "react";
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from "../../services/pushNotification";

import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import FormHelperText from "@material-ui/core/FormHelperText";

import useSettings from "../../hooks/useSettings";
import OnlyForSuperUser from "../OnlyForSuperUser";
import { ToastContainer, toast } from 'react-toastify';
import { makeStyles } from "@material-ui/core/styles";
import { grey, blue } from "@material-ui/core/colors";

import { Tab, Tabs, TextField } from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import useCompanySettings from "../../hooks/useSettings/companySettings";

// ─── Toggle Switch Component ─────────────────────────────────────────────────
function ToggleSetting({ label, value, onChange, loading, trueValue = "enabled", falseValue = "disabled" }) {
  const isOn = value === trueValue || value === true;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "10px 14px",
        borderRadius: 10,
        background: "transparent",
        border: isOn ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.05)",
        boxShadow: "none",
        transition: "all 0.3s ease",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        minHeight: 74,
        justifyContent: "space-between",
        userSelect: "none",
      }}
      onClick={() => !loading && onChange(isOn ? falseValue : trueValue)}
    >
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#444444",
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        lineHeight: 1.3,
      }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#555555",
          letterSpacing: "1px",
        }}>
          {loading ? "ATUALIZANDO..." : (isOn ? "✓ HABILITADO" : "✕ DESABILITADO")}
        </span>
        <div style={{
          position: "relative",
          width: 42,
          height: 22,
          borderRadius: 11,
          background: isOn ? "linear-gradient(90deg, #444, #666)" : "#2d3748",
          border: isOn ? "1px solid #888" : "1px solid #4a5568",
          transition: "all 0.3s ease",
          boxShadow: "none",
          flexShrink: 0,
        }}>
          <div style={{
            position: "absolute",
            top: 2,
            left: isOn ? 22 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: isOn ? "#fff" : "#718096",
            transition: "left 0.25s cubic-bezier(.4,0,.2,1)",
            boxShadow: isOn ? "0 0 4px rgba(255,255,255,0.3)" : "none",
          }} />
        </div>
      </div>
    </div>
  );
}

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: 240,
  },
  cardAvatar: {
    fontSize: "55px",
    color: grey[500],
    backgroundColor: "#ffffff",
    width: theme.spacing(7),
    height: theme.spacing(7),
  },
  cardTitle: {
    fontSize: "18px",
    color: blue[700],
  },
  cardSubtitle: {
    color: grey[600],
    fontSize: "14px",
  },
  alignRight: {
    textAlign: "right",
  },
  fullWidth: {
    width: "100%",
  },
  selectContainer: {
    width: "100%",
    textAlign: "left",
  },
  tab: {
    backgroundColor: theme.mode === 'light' ? "#f2f2f2" : "#7f7f7f",
    borderRadius: 4,
    width: "100%",
    "& .MuiTabs-flexContainer": {
      justifyContent: "center"
    }
  },
}));

export default function Options(props) {
  const { oldSettings, settings, scheduleTypeChanged, user } = props;

  const classes = useStyles();
  const [userRating, setUserRating] = useState("disabled");
  const [scheduleType, setScheduleType] = useState("disabled");
  const [chatBotType, setChatBotType] = useState("text");

  const [loadingUserRating, setLoadingUserRating] = useState(false);
  const [loadingScheduleType, setLoadingScheduleType] = useState(false);

  const [userCreation, setUserCreation] = useState("disabled");
  const [loadingUserCreation, setLoadingUserCreation] = useState(false);

  const [requireDocument, setRequireDocument] = useState("disabled");
  const [loadingRequireDocument, setLoadingRequireDocument] = useState(false);

  const [SendGreetingAccepted, setSendGreetingAccepted] = useState("enabled");
  const [loadingSendGreetingAccepted, setLoadingSendGreetingAccepted] = useState(false);

  const [UserRandom, setUserRandom] = useState("enabled");
  const [loadingUserRandom, setLoadingUserRandom] = useState(false);

  const [SettingsTransfTicket, setSettingsTransfTicket] = useState("enabled");
  const [loadingSettingsTransfTicket, setLoadingSettingsTransfTicket] = useState(false);

  const [AcceptCallWhatsapp, setAcceptCallWhatsapp] = useState("enabled");
  const [loadingAcceptCallWhatsapp, setLoadingAcceptCallWhatsapp] = useState(false);

  const [sendSignMessage, setSendSignMessage] = useState("enabled");
  const [loadingSendSignMessage, setLoadingSendSignMessage] = useState(false);

  const [sendGreetingMessageOneQueues, setSendGreetingMessageOneQueues] = useState("enabled");
  const [loadingSendGreetingMessageOneQueues, setLoadingSendGreetingMessageOneQueues] = useState(false);

  const [sendQueuePosition, setSendQueuePosition] = useState("enabled");
  const [loadingSendQueuePosition, setLoadingSendQueuePosition] = useState(false);

  const [sendFarewellWaitingTicket, setSendFarewellWaitingTicket] = useState("enabled");
  const [loadingSendFarewellWaitingTicket, setLoadingSendFarewellWaitingTicket] = useState(false);

  const [acceptAudioMessageContact, setAcceptAudioMessageContact] = useState("enabled");
  const [loadingAcceptAudioMessageContact, setLoadingAcceptAudioMessageContact] = useState(false);

  //PAYMENT METHODS
  const [eficlientidType, setEfiClientidType] = useState('');
  const [loadingEfiClientidType, setLoadingEfiClientidType] = useState(false);

  const [eficlientsecretType, setEfiClientsecretType] = useState('');
  const [loadingEfiClientsecretType, setLoadingEfiClientsecretType] =
    useState(false);

  const [efichavepixType, setEfiChavepixType] = useState('');
  const [loadingEfiChavepixType, setLoadingEfiChavepixType] = useState(false);

  const [mpaccesstokenType, setmpaccesstokenType] = useState('');
  const [loadingmpaccesstokenType, setLoadingmpaccesstokenType] =
    useState(false);

  const [stripeprivatekeyType, setstripeprivatekeyType] = useState('');
  const [loadingstripeprivatekeyType, setLoadingstripeprivatekeyType] =
    useState(false);

  const [asaastokenType, setasaastokenType] = useState('');
  const [loadingasaastokenType, setLoadingasaastokenType] = useState(false);

  //OPENAI API KEY TRANSCRIÇÃO DE ÁUDIO
  const [openaitokenType, setopenaitokenType] = useState('');
  const [loadingopenaitokenType, setLoadingopenaitokenType] = useState(false);

  //LGPD
  const [enableLGPD, setEnableLGPD] = useState("disabled");
  const [loadingEnableLGPD, setLoadingEnableLGPD] = useState(false);

  const [lgpdMessage, setLGPDMessage] = useState("");
  const [loadinglgpdMessage, setLoadingLGPDMessage] = useState(false);

  const [lgpdLink, setLGPDLink] = useState("");
  const [loadingLGPDLink, setLoadingLGPDLink] = useState(false);

  const [lgpdDeleteMessage, setLGPDDeleteMessage] = useState("disabled");
  const [loadingLGPDDeleteMessage, setLoadingLGPDDeleteMessage] = useState(false);

  //LIMITAR DOWNLOAD
  // const [downloadLimit, setdownloadLimit] = useState("64");
  // const [loadingDownloadLimit, setLoadingdownloadLimit] = useState(false);

  const [lgpdConsent, setLGPDConsent] = useState("disabled");
  const [loadingLGPDConsent, setLoadingLGPDConsent] = useState(false);

  const [lgpdHideNumber, setLGPDHideNumber] = useState("disabled");
  const [loadingLGPDHideNumber, setLoadingLGPDHideNumber] = useState(false);

  // Tag obrigatoria
  const [requiredTag, setRequiredTag] = useState("enabled")
  const [loadingRequiredTag, setLoadingRequiredTag] = useState(false)

  // Fechar ticket ao transferir para outro setor
  const [closeTicketOnTransfer, setCloseTicketOnTransfer] = useState(false)
  const [loadingCloseTicketOnTransfer, setLoadingCloseTicketOnTransfer] = useState(false)

  // Status do ticket ao transferir com usuário
  const [transferredTicketStatus, setTransferredTicketStatus] = useState("open")
  const [loadingTransferredTicketStatus, setLoadingTransferredTicketStatus] = useState(false)

  // Usar carteira de clientes
  const [directTicketsToWallets, setDirectTicketsToWallets] = useState(false)
  const [loadingDirectTicketsToWallets, setLoadingDirectTicketsToWallets] = useState(false)

  // Sigla para inserir no copiar contatos
  const [copyContactPrefix, setCopyContactPrefix] = useState("");
const [loadingCopyContactPrefix, setLoadingCopyContactPrefix] = useState(false);

  //MENSAGENS CUSTOMIZADAS
  const [transferMessage, setTransferMessage] = useState("");
  const [loadingTransferMessage, setLoadingTransferMessage] = useState(false);

  const [greetingAcceptedMessage, setGreetingAcceptedMessage] = useState("");
  const [loadingGreetingAcceptedMessage, setLoadingGreetingAcceptedMessage] = useState(false);

  const [AcceptCallWhatsappMessage, setAcceptCallWhatsappMessage] = useState("");
  const [loadingAcceptCallWhatsappMessage, setLoadingAcceptCallWhatsappMessage] = useState(false);

  const [sendQueuePositionMessage, setSendQueuePositionMessage] = useState("");
  const [loadingSendQueuePositionMessage, setLoadingSendQueuePositionMessage] = useState(false);

  const [showNotificationPending, setShowNotificationPending] = useState(false);
  const [loadingShowNotificationPending, setLoadingShowNotificationPending] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [loadingPush, setLoadingPush] = useState(false);

  // Número de suporte
  const [supportNumber, setSupportNumber] = useState("");
  const [loadingSupportNumber, setLoadingSupportNumber] = useState(false);

  const { update: updateUserCreation, getAll } = useSettings();

  // const { update: updatedownloadLimit } = useSettings();

  const { update: updateeficlientid } = useSettings();
  const { update: updateeficlientsecret } = useSettings();
  const { update: updateefichavepix } = useSettings();
  const { update: updatempaccesstoken } = useSettings();
  const { update: updatestripeprivatekey } = useSettings();
  const { update: updateasaastoken } = useSettings();

  const { update } = useCompanySettings();

  const isSuper = () => {
    return user.super;
  };


  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
  }, []);

  const handleTogglePush = useCallback(async () => {
    setLoadingPush(true);
    try {
      if (pushEnabled) {
        const ok = await unsubscribeFromPush();
        if (ok) {
          setPushEnabled(false);
          toast.success("Notificações push desativadas");
        } else {
          toast.error("Erro ao desativar notificações push");
        }
      } else {
        const ok = await subscribeToPush();
        if (ok) {
          setPushEnabled(true);
          toast.success("Notificações push ativadas com sucesso!");
        } else {
          toast.error("Não foi possível ativar as notificações push. Verifique as permissões do navegador.");
        }
      }
    } catch (err) {
      toast.error("Erro ao alterar notificações push");
    }
    setLoadingPush(false);
  }, [pushEnabled]);

  useEffect(() => {

    if (Array.isArray(oldSettings) && oldSettings.length) {

      const userPar = oldSettings.find((s) => s.key === "userCreation");
      if (userPar) setUserCreation(userPar.value);

      const requireDocPar = oldSettings.find((s) => s.key === "requireDocument");
      if (requireDocPar) setRequireDocument(requireDocPar.value);

      // const downloadLimit = oldSettings.find((s) => s.key === "downloadLimit");

      // if (downloadLimit) {
      //  setdownloadLimit(downloadLimit.value);
      // }

      const copyContactPrefix = oldSettings.find((s) => s.key === 'copyContactPrefix');
      if (copyContactPrefix) {
        setCopyContactPrefix(copyContactPrefix.value);
      }

      const eficlientidType = oldSettings.find((s) => s.key === 'eficlientid');
      if (eficlientidType) {
        setEfiClientidType(eficlientidType.value);
      }

      const eficlientsecretType = oldSettings.find((s) => s.key === 'eficlientsecret');
      if (eficlientsecretType) {
        setEfiClientsecretType(eficlientsecretType.value);
      }

      const efichavepixType = oldSettings.find((s) => s.key === 'efichavepix');
      if (efichavepixType) {
        setEfiChavepixType(efichavepixType.value);
      }

      const mpaccesstokenType = oldSettings.find((s) => s.key === 'mpaccesstoken');
      if (mpaccesstokenType) {
        setmpaccesstokenType(mpaccesstokenType.value);
      }

      const asaastokenType = oldSettings.find((s) => s.key === 'asaastoken');
      if (asaastokenType) {
        setasaastokenType(asaastokenType.value);
      }


      const supportNumberPar = oldSettings.find((s) => s.key === "supportNumber");
      if (supportNumberPar) setSupportNumber(supportNumberPar.value);
    }
  }, [oldSettings])


  useEffect(() => {
    for (const [key, value] of Object.entries(settings)) {
      if (key === "userRating") setUserRating(value);
      if (key === "scheduleType") setScheduleType(value);
      if (key === "chatBotType") setChatBotType(value);
      if (key === "acceptCallWhatsapp") setAcceptCallWhatsapp(value);
      if (key === "userRandom") setUserRandom(value);
      if (key === "sendGreetingMessageOneQueues") setSendGreetingMessageOneQueues(value);
      if (key === "sendSignMessage") setSendSignMessage(value);
      if (key === "sendFarewellWaitingTicket") setSendFarewellWaitingTicket(value);
      if (key === "sendGreetingAccepted") setSendGreetingAccepted(value);
      if (key === "sendQueuePosition") setSendQueuePosition(value);
      if (key === "acceptAudioMessageContact") setAcceptAudioMessageContact(value);
      if (key === "enableLGPD") setEnableLGPD(value);
      if (key === "requiredTag") setRequiredTag(value);
      if (key === "lgpdDeleteMessage") setLGPDDeleteMessage(value)
      if (key === "lgpdHideNumber") setLGPDHideNumber(value);
      if (key === "lgpdConsent") setLGPDConsent(value);
      if (key === "lgpdMessage") setLGPDMessage(value);
      if (key === "sendMsgTransfTicket") setSettingsTransfTicket(value);
      if (key === "lgpdLink") setLGPDLink(value);
      if (key === "DirectTicketsToWallets") setDirectTicketsToWallets(value);
      if (key === "closeTicketOnTransfer") setCloseTicketOnTransfer(value);
      if (key === "transferredTicketStatus") setTransferredTicketStatus(value);
      if (key === "transferMessage") setTransferMessage(value);
      if (key === "greetingAcceptedMessage") setGreetingAcceptedMessage(value);
      if (key === "AcceptCallWhatsappMessage") setAcceptCallWhatsappMessage(value);
      if (key === "sendQueuePositionMessage") setSendQueuePositionMessage(value);
      if (key === "showNotificationPending") setShowNotificationPending(value);
      if (key === "copyContactPrefix") setCopyContactPrefix(value);
    }
  }, [settings]);

  async function handleChangeUserCreation(value) {
    setUserCreation(value);
    setLoadingUserCreation(true);
    await updateUserCreation({ key: "userCreation", value });
    setLoadingUserCreation(false);
  }

  async function handleChangeRequireDocument(value) {
    setRequireDocument(value);
    setLoadingRequireDocument(true);
    await updateUserCreation({ key: "requireDocument", value });
    setLoadingRequireDocument(false);
  }

  // async function handleDownloadLimit(value) {
  //   setdownloadLimit(value);
  //   setLoadingdownloadLimit(true);
  //   await updatedownloadLimit({
  //     key: "downloadLimit",
  //     value,
  //   });
  //   setLoadingdownloadLimit(false);
  // }

  async function handleChangeEfiClientid(value) {
    setEfiClientidType(value);
    setLoadingEfiClientidType(true);
    await updateeficlientid({
      key: 'eficlientid',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingEfiClientidType(false);
  }

async function handleCopyContactPrefix(value) {
  setCopyContactPrefix(value);
  setLoadingCopyContactPrefix(true);
  await update({
    column: "copyContactPrefix",
    data: value
  });
  setLoadingCopyContactPrefix(false);
}

  async function handleChangeEfiClientsecret(value) {
    setEfiClientsecretType(value);
    setLoadingEfiClientsecretType(true);
    await updateeficlientsecret({
      key: 'eficlientsecret',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingEfiClientsecretType(false);
  }

  async function handleChangeEfiChavepix(value) {
    setEfiChavepixType(value);
    setLoadingEfiChavepixType(true);
    await updateefichavepix({
      key: 'efichavepix',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingEfiChavepixType(false);
  }

  async function handleChangempaccesstoken(value) {
    setmpaccesstokenType(value);
    setLoadingmpaccesstokenType(true);
    await updatempaccesstoken({
      key: 'mpaccesstoken',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingmpaccesstokenType(false);
  }

  async function handleChangestripeprivatekey(value) {
    setstripeprivatekeyType(value);
    setLoadingstripeprivatekeyType(true);
    await updatestripeprivatekey({
      key: 'stripeprivatekey',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingstripeprivatekeyType(false);
  }

  async function handleChangeasaastoken(value) {
    setasaastokenType(value);
    setLoadingasaastokenType(true);
    await updateasaastoken({
      key: 'asaastoken',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingasaastokenType(false);
  }


  async function handleChangeUserRating(value) {
    setUserRating(value);
    setLoadingUserRating(true);
    await update({
      column: "userRating",
      data: value
    });
    setLoadingUserRating(false);
  }

  async function handleScheduleType(value) {
    setScheduleType(value);
    setLoadingScheduleType(true);
    await update({
      column: "scheduleType",
      data: value
    });
    setLoadingScheduleType(false);
    if (typeof scheduleTypeChanged === "function") {
      scheduleTypeChanged(value);
    }
  }

  async function handleCopyContactPrefix(value) {
    setCopyContactPrefix(value);
    setLoadingCopyContactPrefix(true);
    await update({
      column: "copyContactPrefix",
      data: value
    });
    setLoadingCopyContactPrefix(false);
  }

  async function handleChatBotType(value) {
    setChatBotType(value);
    await update({
      column: "chatBotType",
      data: value
    });
    if (typeof scheduleTypeChanged === "function") {
      setChatBotType(value);
    }
  }

  async function handleLGPDMessage(value) {
    setLGPDMessage(value);
    setLoadingLGPDMessage(true);
    await update({
      column: "lgpdMessage",
      data: value
    });
    setLoadingLGPDMessage(false);
  }

  async function handletransferMessage(value) {
    setTransferMessage(value);
    setLoadingTransferMessage(true);
    await update({
      column: "transferMessage",
      data: value
    });
    setLoadingTransferMessage(false);
  }

  async function handleGreetingAcceptedMessage(value) {
    setGreetingAcceptedMessage(value);
    setLoadingGreetingAcceptedMessage(true);
    await update({
      column: "greetingAcceptedMessage",
      data: value
    });
    setLoadingGreetingAcceptedMessage(false);
  }

  async function handleAcceptCallWhatsappMessage(value) {
    setAcceptCallWhatsappMessage(value);
    setLoadingAcceptCallWhatsappMessage(true);
    await update({
      column: "AcceptCallWhatsappMessage",
      data: value
    });
    setLoadingAcceptCallWhatsappMessage(false);
  }

  async function handlesendQueuePositionMessage(value) {
    setSendQueuePositionMessage(value);
    setLoadingSendQueuePositionMessage(true);
    await update({
      column: "sendQueuePositionMessage",
      data: value
    });
    setLoadingSendQueuePositionMessage(false);
  }

  async function handleShowNotificationPending(value) {
    setShowNotificationPending(value);
    setLoadingShowNotificationPending(true);
    await update({
      column: "showNotificationPending",
      data: value
    });
    setLoadingShowNotificationPending(false);
  }

  async function handleLGPDLink(value) {
    setLGPDLink(value);
    setLoadingLGPDLink(true);
    await update({
      column: "lgpdLink",
      data: value
    });
    setLoadingLGPDLink(false);
  }

  async function handleLGPDDeleteMessage(value) {
    setLGPDDeleteMessage(value);
    setLoadingLGPDDeleteMessage(true);
    await update({
      column: "lgpdDeleteMessage",
      data: value
    });
    setLoadingLGPDDeleteMessage(false);
  }

  async function handleLGPDConsent(value) {
    setLGPDConsent(value);
    setLoadingLGPDConsent(true);
    await update({
      column: "lgpdConsent",
      data: value
    });
    setLoadingLGPDConsent(false);
  }

  async function handleLGPDHideNumber(value) {
    setLGPDHideNumber(value);
    setLoadingLGPDHideNumber(true);
    await update({
      column: "lgpdHideNumber",
      data: value
    });
    setLoadingLGPDHideNumber(false);
  }

  async function handleSendGreetingAccepted(value) {
    setSendGreetingAccepted(value);
    setLoadingSendGreetingAccepted(true);
    await update({
      column: "sendGreetingAccepted",
      data: value
    });
    setLoadingSendGreetingAccepted(false);
  }

  async function handleUserRandom(value) {
    setUserRandom(value);
    setLoadingUserRandom(true);
    await update({
      column: "userRandom",
      data: value
    });
    setLoadingUserRandom(false);
  }

  async function handleSettingsTransfTicket(value) {
    setSettingsTransfTicket(value);
    setLoadingSettingsTransfTicket(true);
    await update({
      column: "sendMsgTransfTicket",
      data: value
    });
    setLoadingSettingsTransfTicket(false);
  }

  async function handleAcceptCallWhatsapp(value) {
    setAcceptCallWhatsapp(value);
    setLoadingAcceptCallWhatsapp(true);
    await update({
      column: "acceptCallWhatsapp",
      data: value
    });
    setLoadingAcceptCallWhatsapp(false);
  }

  async function handleSendSignMessage(value) {
    setSendSignMessage(value);
    setLoadingSendSignMessage(true);
    await update({
      column: "sendSignMessage",
      data: value
    });
    localStorage.setItem("sendSignMessage", value === "enabled" ? true : false); //atualiza localstorage para sessão
    setLoadingSendSignMessage(false);
  }

  async function handleSendGreetingMessageOneQueues(value) {
    setSendGreetingMessageOneQueues(value);
    setLoadingSendGreetingMessageOneQueues(true);
    await update({
      column: "sendGreetingMessageOneQueues",
      data: value
    });
    setLoadingSendGreetingMessageOneQueues(false);
  }

  async function handleSendQueuePosition(value) {
    setSendQueuePosition(value);
    setLoadingSendQueuePosition(true);
    await update({
      column: "sendQueuePosition",
      data: value
    });
    setLoadingSendQueuePosition(false);
  }

  async function handleSendFarewellWaitingTicket(value) {
    setSendFarewellWaitingTicket(value);
    setLoadingSendFarewellWaitingTicket(true);
    await update({
      column: "sendFarewellWaitingTicket",
      data: value
    });
    setLoadingSendFarewellWaitingTicket(false);
  }

  async function handleAcceptAudioMessageContact(value) {
    setAcceptAudioMessageContact(value);
    setLoadingAcceptAudioMessageContact(true);
    await update({
      column: "acceptAudioMessageContact",
      data: value
    });
    setLoadingAcceptAudioMessageContact(false);
  }

  async function handleEnableLGPD(value) {
    setEnableLGPD(value);
    setLoadingEnableLGPD(true);
    await update({
      column: "enableLGPD",
      data: value
    });
    setLoadingEnableLGPD(false);
  }

  async function handleRequiredTag(value) {
    setRequiredTag(value);
    setLoadingRequiredTag(true);
    await update({
      column: "requiredTag",
      data: value,
    });
    setLoadingRequiredTag(false);
  }

  async function handleCloseTicketOnTransfer(value) {
    setCloseTicketOnTransfer(value);
    setLoadingCloseTicketOnTransfer(true);
    await update({
      column: "closeTicketOnTransfer",
      data: value,
    });
    setLoadingCloseTicketOnTransfer(false);
  }

  async function handleTransferredTicketStatus(value) {
    setTransferredTicketStatus(value);
    setLoadingTransferredTicketStatus(true);
    await update({
      column: "transferredTicketStatus",
      data: value,
    });
    setLoadingTransferredTicketStatus(false);
  }

  async function handleSupportNumber(value) {
    setSupportNumber(value);
    setLoadingSupportNumber(true);
    await updateUserCreation({
      key: "supportNumber",
      value,
    });
    toast.success("Número de suporte atualizado!");
    setLoadingSupportNumber(false);
  }

  async function handleDirectTicketsToWallets(value) {
    setDirectTicketsToWallets(value);
    setLoadingDirectTicketsToWallets(true);
    await update({
      column: "DirectTicketsToWallets",
      data: value,
    });
    setLoadingDirectTicketsToWallets(false);
  }

  return (
    <>
      {/* ── Seção: Configurações Gerais ── */}
      <div style={{
        background: "#f5f5f5",
        borderRadius: 10,
        padding: "20px 20px 16px",
        marginBottom: 20,
        border: "1px solid #e0e0e0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 4, height: 20, background: "#555555", borderRadius: 2 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#333333", letterSpacing: "1px", textTransform: "uppercase" }}>
            Configurações Gerais
          </span>
        </div>

        <Grid spacing={2} container>

          {/* CRIAÇÃO DE COMPANY/USERS */}
          {isSuper() ? (
            <Grid xs={12} sm={6} md={4} item>
              <ToggleSetting
                label={i18n.t("settings.settings.options.creationCompanyUser")}
                value={userCreation}
                onChange={handleChangeUserCreation}
                loading={loadingUserCreation}
              />
            </Grid>
          ) : null}

          {/* AVALIAÇÕES */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.evaluations")}
              value={userRating}
              onChange={handleChangeUserRating}
              loading={loadingUserRating}
            />
          </Grid>

          {/* ENVIAR SAUDAÇÃO AO ACEITAR O TICKET */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.sendGreetingAccepted")}
              value={SendGreetingAccepted}
              onChange={handleSendGreetingAccepted}
              loading={loadingSendGreetingAccepted}
            />
          </Grid>

          {/* ESCOLHER OPERADOR ALEATORIO */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.userRandom")}
              value={UserRandom}
              onChange={handleUserRandom}
              loading={loadingUserRandom}
            />
          </Grid>

          {/* ENVIAR MENSAGEM DE TRANSFERENCIA */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.sendMsgTransfTicket")}
              value={SettingsTransfTicket}
              onChange={handleSettingsTransfTicket}
              loading={loadingSettingsTransfTicket}
            />
          </Grid>

          {/* AVISO SOBRE LIGAÇÃO DO WHATSAPP */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.acceptCallWhatsapp")}
              value={AcceptCallWhatsapp}
              onChange={handleAcceptCallWhatsapp}
              loading={loadingAcceptCallWhatsapp}
            />
          </Grid>

          {/* PERMITE ATENDENTE USAR ASSINATURA */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.sendSignMessage")}
              value={sendSignMessage}
              onChange={handleSendSignMessage}
              loading={loadingSendSignMessage}
            />
          </Grid>

          {/* ENVIAR SAUDAÇÃO QUANDO HOUVER 1 FILA */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.sendGreetingMessageOneQueues")}
              value={sendGreetingMessageOneQueues}
              onChange={handleSendGreetingMessageOneQueues}
              loading={loadingSendGreetingMessageOneQueues}
            />
          </Grid>

          {/* ENVIAR MENSAGEM COM POSIÇÃO DA FILA */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.sendQueuePosition")}
              value={sendQueuePosition}
              onChange={handleSendQueuePosition}
              loading={loadingSendQueuePosition}
            />
          </Grid>

          {/* ENVIAR DESPEDIDA NO AGUARDANDO */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.sendFarewellWaitingTicket")}
              value={sendFarewellWaitingTicket}
              onChange={handleSendFarewellWaitingTicket}
              loading={loadingSendFarewellWaitingTicket}
            />
          </Grid>

          {/* ACEITAR ÁUDIO DE CONTATOS */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.acceptAudioMessageContact")}
              value={acceptAudioMessageContact}
              onChange={handleAcceptAudioMessageContact}
              loading={loadingAcceptAudioMessageContact}
            />
          </Grid>

          {/* HABILITAR LGPD */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.enableLGPD")}
              value={enableLGPD}
              onChange={handleEnableLGPD}
              loading={loadingEnableLGPD}
            />
          </Grid>

          {/* TAG OBRIGATÓRIA */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.requiredTag")}
              value={requiredTag}
              onChange={handleRequiredTag}
              loading={loadingRequiredTag}
            />
          </Grid>

          {/* FECHAR TICKET AO TRANSFERIR */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.closeTicketOnTransfer")}
              value={closeTicketOnTransfer}
              onChange={handleCloseTicketOnTransfer}
              loading={loadingCloseTicketOnTransfer}
              trueValue={true}
              falseValue={false}
            />
          </Grid>

          {/* MOSTRAR NOTIFICAÇÃO PENDENTES */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.showNotificationPending")}
              value={showNotificationPending}
              onChange={handleShowNotificationPending}
              loading={loadingShowNotificationPending}
              trueValue={true}
              falseValue={false}
            />
          </Grid>

          {/* MOVER PARA CARTEIRA */}
          <Grid xs={12} sm={6} md={4} item>
            <ToggleSetting
              label={i18n.t("settings.settings.options.DirectTicketsToWallets")}
              value={directTicketsToWallets}
              onChange={handleDirectTicketsToWallets}
              loading={loadingDirectTicketsToWallets}
              trueValue={true}
              falseValue={false}
            />
          </Grid>

          {/* NÚMERO DE SUPORTE - apenas super */}
          {isSuper() ? (
            <Grid xs={12} sm={6} md={4} item>
              <div style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "#ffffff",
                border: "1px solid #cccccc",
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#444444",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  lineHeight: 1.3,
                  display: "block",
                  marginBottom: 8,
                }}>
                  📞 Número de Suporte
                </span>
                <TextField
                  size="small"
                  variant="outlined"
                  fullWidth
                  placeholder="Ex: 5511999998888"
                  value={supportNumber}
                  onChange={(e) => setSupportNumber(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => handleSupportNumber(supportNumber)}
                  disabled={loadingSupportNumber}
                  helperText="Número com código do país (usado no botão Chamar Suporte)"
                  inputProps={{ maxLength: 15 }}
                />
              </div>
            </Grid>
          ) : null}
        </Grid>
      </div>

      {/* ── Seção: Agendamento e Bot ── */}
      <div style={{
        background: "#f5f5f5",
        borderRadius: 10,
        padding: "20px 20px 16px",
        marginBottom: 20,
        border: "1px solid #e0e0e0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 4, height: 20, background: "#555555", borderRadius: 2 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#333333", letterSpacing: "1px", textTransform: "uppercase" }}>
            Agendamento & Bot
          </span>
        </div>
        <Grid spacing={2} container>
          {/* AGENDAMENTO DE EXPEDIENTE */}
          <Grid xs={12} sm={6} md={4} item>
            <FormControl className={classes.selectContainer} style={{ background: "#ffffff", borderRadius: 8, padding: "10px 14px", border: "1px solid #cccccc" }}>
              <InputLabel id="schedule-type-label" style={{ color: "#444444", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", top: 10, left: 14 }}>
                {i18n.t("settings.settings.options.officeScheduling")}
              </InputLabel>
              <Select
                labelId="schedule-type-label"
                value={scheduleType}
                onChange={async (e) => { handleScheduleType(e.target.value); }}
                style={{ color: "#333333", marginTop: 24 }}
                disableUnderline
              >
                <MenuItem value={"disabled"}>{i18n.t("settings.settings.options.disabled")}</MenuItem>
                <MenuItem value={"queue"}>{i18n.t("settings.settings.options.queueManagement")}</MenuItem>
                <MenuItem value={"company"}>{i18n.t("settings.settings.options.companyManagement")}</MenuItem>
                <MenuItem value={"connection"}>{i18n.t("settings.settings.options.connectionManagement")}</MenuItem>
              </Select>
              <FormHelperText style={{ color: "#555555", fontSize: 10 }}>
                {loadingScheduleType && i18n.t("settings.settings.options.updating")}
              </FormHelperText>
            </FormControl>
          </Grid>

          {/* TIPO DO BOT */}
          <Grid xs={12} sm={6} md={4} item>
            <FormControl className={classes.selectContainer} style={{ background: "#ffffff", borderRadius: 8, padding: "10px 14px", border: "1px solid #cccccc" }}>
              <InputLabel id="chatbot-type-label" style={{ color: "#444444", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", top: 10, left: 14 }}>
                {i18n.t("settings.settings.options.chatBotType")}
              </InputLabel>
              <Select
                labelId="chatbot-type-label"
                value={chatBotType}
                onChange={async (e) => { handleChatBotType(e.target.value); }}
                style={{ color: "#333333", marginTop: 24 }}
                disableUnderline
              >
                <MenuItem value={"text"}>Texto</MenuItem>
              </Select>
              <FormHelperText style={{ color: "#555555", fontSize: 10 }}>
                {loadingScheduleType && i18n.t("settings.settings.options.updating")}
              </FormHelperText>
            </FormControl>
          </Grid>

          {/* STATUS AO TRANSFERIR COM USUÁRIO */}
          <Grid xs={12} sm={6} md={4} item>
            <FormControl className={classes.selectContainer} style={{ background: "#ffffff", borderRadius: 8, padding: "10px 14px", border: "1px solid #cccccc" }}>
              <InputLabel id="transferredTicketStatus-label" style={{ color: "#444444", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", top: 10, left: 14 }}>
                {i18n.t("settings.settings.options.transferredTicketStatus")}
              </InputLabel>
              <Select
                labelId="transferredTicketStatus-label"
                value={transferredTicketStatus}
                onChange={async (e) => { handleTransferredTicketStatus(e.target.value); }}
                style={{ color: "#333333", marginTop: 24 }}
                disableUnderline
              >
                <MenuItem value={"open"}>{i18n.t("settings.settings.options.open")}</MenuItem>
                <MenuItem value={"pending"}>{i18n.t("settings.settings.options.pending")}</MenuItem>
              </Select>
              <FormHelperText style={{ color: "#555555", fontSize: 10 }}>
                {loadingTransferredTicketStatus && i18n.t("settings.settings.options.updating")}
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      </div>

      {/* ── Seção: Cadastro de Empresas (apenas super admin) ── */}
      <OnlyForSuperUser
        user={user}
        yes={() => (
          <div style={{
            background: "#f5f5f5",
            borderRadius: 10,
            padding: "20px 20px 16px",
            marginBottom: 20,
            border: "1px solid #e0e0e0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 4, height: 20, background: "#555555", borderRadius: 2 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#333333", letterSpacing: "1px", textTransform: "uppercase" }}>
                Cadastro de Empresas
              </span>
            </div>
            <Grid spacing={2} container>
              <Grid xs={12} sm={6} md={4} item>
                <ToggleSetting
                  label="Exigir CPF/CNPJ no Cadastro"
                  value={requireDocument}
                  onChange={handleChangeRequireDocument}
                  loading={loadingRequireDocument}
                />
              </Grid>
            </Grid>
          </div>
        )}
      />

      {/* ── Seção: Notificações Push (apenas super admin) ── */}
      <OnlyForSuperUser
        user={user}
        yes={() => (
          <div style={{
            background: "#f5f5f5",
            borderRadius: 10,
            padding: "20px 20px 16px",
            marginBottom: 20,
            border: "1px solid #e0e0e0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 4, height: 20, background: "#555555", borderRadius: 2 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#333333", letterSpacing: "1px", textTransform: "uppercase" }}>
                Notificações Push
              </span>
            </div>
            <Grid spacing={2} container alignItems="center">
              <Grid xs={12} sm={6} md={4} item>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "transparent",
                    border: pushEnabled ? "1px solid rgba(76,175,80,0.3)" : "1px solid rgba(255,255,255,0.05)",
                    minHeight: 74,
                    justifyContent: "space-between",
                    userSelect: "none",
                    cursor: loadingPush ? "not-allowed" : "pointer",
                    opacity: loadingPush ? 0.7 : 1,
                    transition: "all 0.3s ease",
                  }}
                  onClick={handleTogglePush}
                >
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#444444",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    lineHeight: 1.3,
                  }}>
                    {loadingPush ? "Processando..." : pushEnabled ? "🔔 Push Ativado" : "🔕 Push Desativado"}
                  </span>
                  <div style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    background: pushEnabled ? "#4caf50" : "#ccc",
                    position: "relative",
                    transition: "background 0.3s ease",
                  }}>
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: 2,
                      left: pushEnabled ? 20 : 2,
                      transition: "left 0.3s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }} />
                  </div>
                </div>
              </Grid>
              <Grid xs={12} sm={6} md={8} item>
                <span style={{ fontSize: 12, color: "#666" }}>
                  Ative para receber notificações push neste navegador quando houver novas mensagens.
                </span>
              </Grid>
            </Grid>
          </div>
        )}
      />

      <br />


      {/* CONFIGURAÇÃO SIGLA PARA CÓPIA DE CONTATOS */}
      <Grid spacing={3} container style={{ marginBottom: 10 }}>
                  <Tabs
            indicatorColor='primary'
            textColor='primary'
            scrollButtons='on'
            variant='scrollable'
            className={classes.tab}
            style={{
              marginBottom: 20,
              marginTop: 20,
            }}
          >
            <Tab label='Configuração de Sigla para Copia de Contato' />
          </Tabs>
        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="copyContactPrefix"
              name="copyContactPrefix"
              margin="dense"
              label={i18n.t("settings.settings.options.copyContactPrefix")}
              variant="outlined"
              value={copyContactPrefix}
              placeholder={i18n.t("settings.settings.options.copyContactPrefixPlaceholder")}
              onChange={async (e) => {
                handleCopyContactPrefix(e.target.value);
              }}
                InputLabelProps={{
    shrink: true,
  }}
            />
            <FormHelperText>
              {loadingCopyContactPrefix && i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
      </Grid>

      
      {/*-----------------LGPD-----------------*/}
      {enableLGPD === "enabled" && (
        <>
          <Grid spacing={3} container
            style={{ marginBottom: 10 }}>
            <Tabs
              value={0}
              indicatorColor="primary"
              textColor="primary"
              scrollButtons="on"
              variant="scrollable"
              className={classes.tab}
            >
              <Tab

                label={i18n.t("settings.settings.LGPD.title")} />

            </Tabs>
          </Grid>
          <Grid spacing={1} container>
            <Grid xs={12} sm={6} md={12} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="lgpdMessage"
                  name="lgpdMessage"
                  margin="dense"
                  multiline
                  rows={3}
                  label={i18n.t("settings.settings.LGPD.welcome")}
                  variant="outlined"
                  value={lgpdMessage}
                  onChange={async (e) => {
                    handleLGPDMessage(e.target.value);
                  }}
                >
                </TextField>
                <FormHelperText>
                  {loadinglgpdMessage && i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6} md={12} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="lgpdLink"
                  name="lgpdLink"
                  margin="dense"
                  label={i18n.t("settings.settings.LGPD.linkLGPD")}
                  variant="outlined"
                  value={lgpdLink}
                  onChange={async (e) => {
                    handleLGPDLink(e.target.value);
                  }}
                >
                </TextField>
                <FormHelperText>
                  {loadingLGPDLink && i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
            {/* LGPD Manter ou nao mensagem deletada pelo contato */}
            <Grid xs={12} sm={6} md={4} item>
              <FormControl className={classes.selectContainer}>
                <InputLabel id="lgpdDeleteMessage-label">{i18n.t("settings.settings.LGPD.obfuscateMessageDelete")}</InputLabel>
                <Select
                  labelId="lgpdDeleteMessage-label"
                  value={lgpdDeleteMessage}
                  onChange={async (e) => {
                    handleLGPDDeleteMessage(e.target.value);
                  }}
                >
                  <MenuItem value={"disabled"}>{i18n.t("settings.settings.LGPD.disabled")}</MenuItem>
                  <MenuItem value={"enabled"}>{i18n.t("settings.settings.LGPD.enabled")}</MenuItem>
                </Select>
                <FormHelperText>
                  {loadingLGPDDeleteMessage && i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
            {/* LGPD Sempre solicitar confirmaçao / conscentimento dos dados */}
            <Grid xs={12} sm={6} md={4} item>
              <FormControl className={classes.selectContainer}>
                <InputLabel id="lgpdConsent-label">
                  {i18n.t("settings.settings.LGPD.alwaysConsent")}
                </InputLabel>
                <Select
                  labelId="lgpdConsent-label"
                  value={lgpdConsent}
                  onChange={async (e) => {
                    handleLGPDConsent(e.target.value);
                  }}
                >
                  <MenuItem value={"disabled"}>{i18n.t("settings.settings.LGPD.disabled")}</MenuItem>
                  <MenuItem value={"enabled"}>{i18n.t("settings.settings.LGPD.enabled")}</MenuItem>
                </Select>
                <FormHelperText>
                  {loadingLGPDConsent && i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
            {/* LGPD Ofuscar número telefone para usuários */}
            <Grid xs={12} sm={6} md={4} item>
              <FormControl className={classes.selectContainer}>
                <InputLabel id="lgpdHideNumber-label">
                  {i18n.t("settings.settings.LGPD.obfuscatePhoneUser")}
                </InputLabel>
                <Select
                  labelId="lgpdHideNumber-label"
                  value={lgpdHideNumber}
                  onChange={async (e) => {
                    handleLGPDHideNumber(e.target.value);
                  }}
                >
                  <MenuItem value={"disabled"}>{i18n.t("settings.settings.LGPD.disabled")}</MenuItem>
                  <MenuItem value={"enabled"}>{i18n.t("settings.settings.LGPD.enabled")}</MenuItem>
                </Select>
                <FormHelperText>
                  {loadingLGPDHideNumber && i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        </>
      )}

      <Grid spacing={3} container>
        {isSuper() ?
          <Tabs
            indicatorColor='primary'
            textColor='primary'
            scrollButtons='on'
            variant='scrollable'
            className={classes.tab}
            style={{
              marginBottom: 20,
              marginTop: 20,
            }}
          >
            <Tab label='Configuração Pix Efí (GerenciaNet)' />
          </Tabs>
          : null}
      </Grid>

      <Grid spacing={3} container style={{ marginBottom: 10 }}>
        <Grid xs={12} sm={6} md={6} item>
          {isSuper() ?
            <FormControl className={classes.selectContainer}>
              <TextField
                id='eficlientid'
                name='eficlientid'
                margin='dense'
                label='Client ID'
                variant='outlined'
                value={eficlientidType}
                onChange={async (e) => {
                  handleChangeEfiClientid(e.target.value);
                }}
              ></TextField>
              <FormHelperText>
                {loadingEfiClientidType && 'Atualizando...'}
              </FormHelperText>
            </FormControl>
            : null}
        </Grid>
        <Grid xs={12} sm={6} md={6} item>
          {isSuper() ?
            <FormControl className={classes.selectContainer}>
              <TextField
                id='eficlientsecret'
                name='eficlientsecret'
                margin='dense'
                label='Client Secret'
                variant='outlined'
                value={eficlientsecretType}
                onChange={async (e) => {
                  handleChangeEfiClientsecret(e.target.value);
                }}
              ></TextField>
              <FormHelperText>
                {loadingEfiClientsecretType && 'Atualizando...'}
              </FormHelperText>
            </FormControl>
            : null}
        </Grid>
        <Grid xs={12} sm={12} md={12} item>
          {isSuper() ?
            <FormControl className={classes.selectContainer}>
              <TextField
                id='efichavepix'
                name='efichavepix'
                margin='dense'
                label='Chave PIX'
                variant='outlined'
                value={efichavepixType}
                onChange={async (e) => {
                  handleChangeEfiChavepix(e.target.value);
                }}
              ></TextField>
              <FormHelperText>
                {loadingEfiChavepixType && 'Atualizando...'}
              </FormHelperText>
            </FormControl>
            : null}
        </Grid>
      </Grid>

      <Grid spacing={3} container>
        {isSuper() ?
          <Tabs
            indicatorColor='primary'
            textColor='primary'
            scrollButtons='on'
            variant='scrollable'
            className={classes.tab}
            style={{
              marginBottom: 20,
              marginTop: 20,
            }}
          >
            <Tab label='Mercado Pago' />
          </Tabs>
          : null}
      </Grid>

      <Grid spacing={3} container style={{ marginBottom: 10 }}>
        <Grid xs={12} sm={12} md={12} item>
          {isSuper() ?
            <FormControl className={classes.selectContainer}>
              <TextField
                id='mpaccesstoken'
                name='mpaccesstoken'
                margin='dense'
                label='Access Token'
                variant='outlined'
                value={mpaccesstokenType}
                onChange={async (e) => {
                  handleChangempaccesstoken(e.target.value);
                }}
              ></TextField>
              <FormHelperText>
                {loadingmpaccesstokenType && 'Atualizando...'}
              </FormHelperText>
            </FormControl>
            : null}
        </Grid>
      </Grid>

      <Grid spacing={3} container>
        {isSuper() ?
          <Tabs
            indicatorColor='primary'
            textColor='primary'
            scrollButtons='on'
            variant='scrollable'
            className={classes.tab}
            style={{
              marginBottom: 20,
              marginTop: 20,
            }}
          >
            <Tab label='Stripe' />
          </Tabs>
          : null}
      </Grid>

      <Grid spacing={3} container style={{ marginBottom: 10 }}>
        <Grid xs={12} sm={12} md={12} item>
          {isSuper() ?
            <FormControl className={classes.selectContainer}>
              <TextField
                id='stripeprivatekey'
                name='stripeprivatekey'
                margin='dense'
                label='Stripe Private Key'
                variant='outlined'
                value={stripeprivatekeyType}
                onChange={async (e) => {
                  handleChangestripeprivatekey(e.target.value);
                }}
              ></TextField>
              <FormHelperText>
                {loadingstripeprivatekeyType && 'Atualizando...'}
              </FormHelperText>
            </FormControl>
            : null}
        </Grid>
      </Grid>

      <Grid spacing={3} container>
        {isSuper() ?
          <Tabs
            indicatorColor='primary'
            textColor='primary'
            scrollButtons='on'
            variant='scrollable'
            className={classes.tab}
            style={{
              marginBottom: 20,
              marginTop: 20,
            }}
          >
            <Tab label='ASAAS' />
          </Tabs>
          : null}
      </Grid>

      <Grid spacing={3} container style={{ marginBottom: 10 }}>
        <Grid xs={12} sm={12} md={12} item>
          {isSuper() ?
            <FormControl className={classes.selectContainer}>
              <TextField
                id='asaastoken'
                name='asaastoken'
                margin='dense'
                label='Token Asaas'
                variant='outlined'
                value={asaastokenType}
                onChange={async (e) => {
                  handleChangeasaastoken(e.target.value);
                }}
              ></TextField>
              <FormHelperText>
                {loadingasaastokenType && 'Atualizando...'}
              </FormHelperText>
            </FormControl>
            : null}
        </Grid>
      </Grid>

      <Grid spacing={3} container style={{ marginBottom: 10 }}>
        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="transferMessage"
              name="transferMessage"
              margin="dense"
              multiline
              rows={3}
              label={i18n.t("settings.settings.customMessages.transferMessage")}
              variant="outlined"
              value={transferMessage}
              required={SettingsTransfTicket === "enabled"}
              onChange={async (e) => {
                handletransferMessage(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingTransferMessage && i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="greetingAcceptedMessage"
              name="greetingAcceptedMessage"
              margin="dense"
              multiline
              rows={3}
              label={i18n.t("settings.settings.customMessages.greetingAcceptedMessage")}
              variant="outlined"
              value={greetingAcceptedMessage}
              required={SendGreetingAccepted === "enabled"}
              onChange={async (e) => {
                handleGreetingAcceptedMessage(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingGreetingAcceptedMessage && i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="AcceptCallWhatsappMessage"
              name="AcceptCallWhatsappMessage"
              margin="dense"
              multiline
              rows={3}
              label={i18n.t("settings.settings.customMessages.AcceptCallWhatsappMessage")}
              variant="outlined"
              required={AcceptCallWhatsapp === "disabled"}
              value={AcceptCallWhatsappMessage}
              onChange={async (e) => {
                handleAcceptCallWhatsappMessage(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingAcceptCallWhatsappMessage && i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="sendQueuePositionMessage"
              name="sendQueuePositionMessage"
              margin="dense"
              multiline
              required={sendQueuePosition === "enabled"}
              rows={3}
              label={i18n.t("settings.settings.customMessages.sendQueuePositionMessage")}
              variant="outlined"
              value={sendQueuePositionMessage}
              onChange={async (e) => {
                handlesendQueuePositionMessage(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingSendQueuePositionMessage && i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
      </Grid>
    </>
  );
}
