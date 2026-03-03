// src/pages/Contacts/index.js (versão corrigida)
import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
  useRef,
} from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { Facebook, Instagram, WhatsApp, Close, Sync, SyncDisabled, CheckCircle as SyncDone, CloudOff } from "@material-ui/icons";
import Select from "@material-ui/core/Select";
import ListItemText from "@material-ui/core/ListItemText";
import Chip from "@material-ui/core/Chip";
import Box from "@material-ui/core/Box";
import LinearProgress from "@material-ui/core/LinearProgress";
import CircularProgress from "@material-ui/core/CircularProgress";
import DialogActions from "@material-ui/core/DialogActions";
import Backdrop from "@material-ui/core/Backdrop";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CancelIcon from "@material-ui/icons/Cancel";
import BlockIcon from "@material-ui/icons/Block";
import Checkbox from "@material-ui/core/Checkbox";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Tooltip from "@material-ui/core/Tooltip";
import { alpha } from "@material-ui/core/styles";

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal/";
import ContactDeleteConfirmModal from "../../components/ContactDeleteConfirmModal";

import { i18n } from "../../translate/i18n";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";
import ForbiddenPage from "../../components/ForbiddenPage";

import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NewTicketModal from "../../components/NewTicketModal";
import NewTicketOficialModal from "../../components/NewTicketOficialModal";
import { TagsFilter } from "../../components/TagsFilter";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import formatSerializedId from "../../utils/formatSerializedId";
import { v4 as uuidv4 } from "uuid";

import { ArrowDropDown, Backup, ContactPhone, DeleteSweep } from "@material-ui/icons";
import { Menu, MenuItem } from "@material-ui/core";

import ContactImportWpModal from "../../components/ContactImportWpModal";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import usePlans from "../../hooks/usePlans";
import { TicketsContext } from "../../context/Tickets/TicketsContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_CONTACTS") {
    const contacts = action.payload;
    const newContacts = [];

    contacts.forEach((contact) => {
      const contactIndex = state.findIndex((c) => c.id === contact.id);
      if (contactIndex !== -1) {
        state[contactIndex] = contact;
      } else {
        newContacts.push(contact);
      }
    });

    return [...state, ...newContacts];
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contact.id);

    if (contactIndex !== -1) {
      state[contactIndex] = contact;
      return [...state];
    } else {
      return [contact, ...state];
    }
  }

  if (action.type === "DELETE_CONTACT") {
    const contactId = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contactId);
    if (contactIndex !== -1) {
      state.splice(contactIndex, 1);
    }
    return [...state];
  }

  if (action.type === "BULK_DELETE_CONTACTS") {
    const contactIds = action.payload;
    return state.filter(contact => !contactIds.includes(contact.id));
  }

  if (action.type === "DELETE_ALL_CONTACTS") {
    const { excludeIds = [] } = action.payload;
    return state.filter(contact => excludeIds.includes(contact.id));
  }

  if (action.type === "RESET") {
    return [];
  }

  if (action.type === "SET_TOTAL_COUNT") {
    // Não altera o estado, mas permite rastrear o total
    return state;
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  avatarCell: {
    width: '60px',
    padding: theme.spacing(1),
  },
  idCell: {
    width: '80px',
  },
  checkboxCell: {
    width: '48px',
    padding: theme.spacing(0, 1),
  },
  clickableAvatar: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'scale(1.1)',
    },
  },
  imageDialog: {
    '& .MuiDialog-paper': {
      maxWidth: '500px',
      maxHeight: '500px',
    },
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing(1),
  },
  profileImage: {
    width: '100%',
    height: 'auto',
    maxWidth: '400px',
    maxHeight: '400px',
    objectFit: 'contain',
  },
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(1),
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    minHeight: 48,
  },
  toolbarHighlight: {
    backgroundColor: alpha(theme.palette.primary.main, 0.25),
  },
  toolbarTitle: {
    flex: '1 1 100%',
    fontWeight: 600,
  },
  bulkActions: {
    display: 'flex',
    gap: theme.spacing(1),
  },
  syncBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
  },
  syncReady: {
    backgroundColor: alpha(theme.palette.success?.main || '#4caf50', 0.1),
    border: `1px solid ${alpha(theme.palette.success?.main || '#4caf50', 0.3)}`,
    color: theme.palette.success?.dark || '#2e7d32',
  },
  syncSyncing: {
    backgroundColor: alpha(theme.palette.warning?.main || '#ff9800', 0.1),
    border: `1px solid ${alpha(theme.palette.warning?.main || '#ff9800', 0.3)}`,
    color: theme.palette.warning?.dark || '#e65100',
  },
  syncError: {
    backgroundColor: alpha(theme.palette.error?.main || '#f44336', 0.1),
    border: `1px solid ${alpha(theme.palette.error?.main || '#f44336', 0.3)}`,
    color: theme.palette.error?.dark || '#c62828',
  },
  syncIcon: {
    animation: '$spin 1.5s linear infinite',
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
}));

const Contacts = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user, socket } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(reducer, []);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [totalContactsCount, setTotalContactsCount] = useState(0);

  // Estados para seleção múltipla
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [selectAllMode, setSelectAllMode] = useState(false); // true = todos da empresa, false = apenas da página

  const [importContactModalOpen, setImportContactModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(null);
  const [ImportContacts, setImportContacts] = useState(null);
  const [blockingContact, setBlockingContact] = useState(null);
  const [unBlockingContact, setUnBlockingContact] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exportContact, setExportContact] = useState(false);
  const [confirmChatsOpen, setConfirmChatsOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [newTicketOficialModalOpen, setNewTicketOficialModalOpen] = useState(false);
  const [contactTicket, setContactTicket] = useState({});

  // Estado para modal de seleção de conexão para importação
  const [importConnectionModalOpen, setImportConnectionModalOpen] = useState(false);
  const [importWhatsapps, setImportWhatsapps] = useState([]);
  const [selectedImportWhatsappId, setSelectedImportWhatsappId] = useState("");
  
  // Estados para exclusão múltipla com confirmação tipada
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(''); // 'selected' ou 'all'
  
  const fileUploadRef = useRef(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const { setCurrentTicket } = useContext(TicketsContext);

  // Estados para o modal de imagem
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedContactName, setSelectedContactName] = useState('');

  const { getAll: getAllSettings } = useCompanySettings();
  const [hideNum, setHideNum] = useState(false);
  const [enableLGPD, setEnableLGPD] = useState(false);
  const [useWhatsappOfficial, setUseWhatsappOfficial] = useState(false);

  // Estado para status de sincronização
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const { getPlanCompany } = usePlans();
  
  useEffect(() => {
    async function fetchData() {
      const settingList = await getAllSettings(user.companyId);

      for (const [key, value] of Object.entries(settingList)) {
        if (key === "enableLGPD") setEnableLGPD(value === "enabled");
        if (key === "lgpdHideNumber") setHideNum(value === "enabled");
      }

      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);
      setUseWhatsappOfficial(planConfigs.plan.useWhatsappOfficial);
    }
    fetchData();
  }, []);

  // Buscar status de sincronização
  const fetchSyncStatus = async () => {
    try {
      setSyncLoading(true);
      const { data } = await api.get("/contacts/sync-status");
      setSyncStatus(data);
    } catch (err) {
      // Silencioso - não bloquear a tela por erro de sync status
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();

    // Polling a cada 30s enquanto não estiver sincronizado
    const interval = setInterval(() => {
      if (!syncStatus || syncStatus.status !== "ready") {
        fetchSyncStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Funções para seleção múltipla CORRIGIDAS
  const handleSelectContact = (contactId) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
    setSelectAllMode(false); // Desativa modo "todos da empresa" quando seleciona individualmente
  };

  const handleSelectAllContacts = () => {
    if (selectAllMode) {
      // Se já está em modo "todos", desmarcar tudo
      setSelectedContacts(new Set());
      setSelectAllMode(false);
    } else {
      // Verificar se todos da página atual estão selecionados
      const currentPageIds = contacts.map(contact => contact.id);
      const allCurrentSelected = currentPageIds.every(id => selectedContacts.has(id));
      
      if (allCurrentSelected && selectedContacts.size === currentPageIds.length) {
        // Se todos da página estão selecionados, ativar modo "todos da empresa"
        setSelectAllMode(true);
        setSelectedContacts(new Set()); // Limpar seleção individual
      } else {
        // Selecionar todos da página atual
        setSelectedContacts(new Set(currentPageIds));
        setSelectAllMode(false);
      }
    }
  };

  // Limpar seleção quando contatos mudam
  useEffect(() => {
    setSelectedContacts(new Set());
    setSelectAllMode(false);
  }, [searchParam, selectedTags]);

  // Função para obter contagem correta
  const getSelectedCount = () => {
    if (selectAllMode) {
      return totalContactsCount;
    }
    return selectedContacts.size;
  };

  // Função para obter texto do botão
  const getSelectionButtonText = () => {
    if (selectAllMode) {
      return `Excluir Todos (${totalContactsCount})`;
    }
    if (selectedContacts.size > 0) {
      return `Excluir Selecionados (${selectedContacts.size})`;
    }
    return "Excluir";
  };

  // Funções para exclusão múltipla CORRIGIDAS
  const handleBulkDeleteClick = () => {
    if (selectAllMode) {
      setDeleteType('all');
    } else if (selectedContacts.size > 0) {
      setDeleteType('selected');
    } else {
      toast.warning("Selecione pelo menos um contato para excluir");
      return;
    }
    setDeleteConfirmModalOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      if (deleteType === 'all') {
        await api.delete("/contacts/all", {
          data: {
            confirmation: "DELETE_ALL_CONTACTS",
            excludeIds: []
          }
        });
        toast.success(`Todos os ${totalContactsCount} contatos foram excluídos`);
      } else {
        const contactIds = Array.from(selectedContacts);
        await api.post("/contacts/bulk-delete", { contactIds });
        toast.success(`${contactIds.length} contatos excluídos com sucesso`);
      }
      
      // Resetar seleções
      setSelectedContacts(new Set());
      setSelectAllMode(false);
      
      // Atualizar lista
      setSearchParam("");
      setPageNumber(1);
      
    } catch (err) {
      toastError(err);
    } finally {
      setDeleteConfirmModalOpen(false);
      setDeleteType('');
    }
  };

  const handleDeleteAllClick = () => {
    setDeleteType('all');
    setDeleteConfirmModalOpen(true);
  };

  // Função para abrir modal da imagem
  const handleOpenImageModal = (imageUrl, contactName) => {
    setSelectedImage(imageUrl);
    setSelectedContactName(contactName);
    setImageModalOpen(true);
  };

  // Função para fechar modal da imagem
  const handleCloseImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage('');
    setSelectedContactName('');
  };

  const handleImportExcel = async () => {
    try {
      const formData = new FormData();
      formData.append("file", fileUploadRef.current.files[0]);
      await api.request({
        url: `/contacts/upload`,
        method: "POST",
        data: formData,
      });
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam, selectedTags]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("/contacts/", {
            params: {
              searchParam,
              pageNumber,
              contactTag: JSON.stringify(selectedTags),
            },
          });
          dispatch({ type: "LOAD_CONTACTS", payload: data.contacts });
          setHasMore(data.hasMore);
          setTotalContactsCount(data.count); // Armazenar contagem total
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, selectedTags]);

  useEffect(() => {
    const companyId = user.companyId;

    const onContactEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
        setTotalContactsCount(prev => Math.max(0, prev - 1));
      }

      if (data.action === "bulk-delete") {
        dispatch({ type: "BULK_DELETE_CONTACTS", payload: data.contactIds });
        setTotalContactsCount(prev => Math.max(0, prev - data.contactIds.length));
      }

      if (data.action === "delete-all") {
        dispatch({ type: "DELETE_ALL_CONTACTS", payload: { excludeIds: data.excludeIds } });
        setTotalContactsCount(data.excludeIds.length);
      }
    };
    
    socket.on(`company-${companyId}-contact`, onContactEvent);

    return () => {
      socket.off(`company-${companyId}-contact`, onContactEvent);
    };
  }, [socket]);

  const handleSelectTicket = (ticket) => {
    const code = uuidv4();
    const { id, uuid } = ticket;
    setCurrentTicket({ id, uuid, code });
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      handleSelectTicket(ticket);
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const handleCloseOrOpenTicketOficial = (ticket) => {
    setNewTicketOficialModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      handleSelectTicket(ticket);
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const handleSelectedTags = (selecteds) => {
    const tags = selecteds.map((t) => t.id);
    setSelectedTags(tags);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  const hadleEditContact = (contactId) => {
    setSelectedContactId(contactId);
    setContactModalOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleBlockContact = async (contactId) => {
    try {
      await api.put(`/contacts/block/${contactId}`, { active: false });
      toast.success("Contato bloqueado");
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSearchParam("");
    setPageNumber(1);
    setBlockingContact(null);
  };

  const handleUnBlockContact = async (contactId) => {
    try {
      await api.put(`/contacts/block/${contactId}`, { active: true });
      toast.success("Contato desbloqueado");
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSearchParam("");
    setPageNumber(1);
    setUnBlockingContact(null);
  };

  const [importingContacts, setImportingContacts] = useState(false);
  const [importProgress, setImportProgress] = useState({ status: "", message: "", progress: 0 });

  // Escutar progresso da importação via socket
  useEffect(() => {
    if (!user?.companyId || !socket) return;

    const onImportProgress = (data) => {
      setImportProgress(data);
      if (data.status === "done") {
        toast.success(data.message || "Contatos importados com sucesso!");
        setImportingContacts(false);
        setPageNumber(1);
        setSearchParam("");
        dispatch({ type: "RESET" });
        // Limpar progresso após 3s
        setTimeout(() => setImportProgress({ status: "", message: "", progress: 0 }), 3000);
      } else if (data.status === "warning") {
        toast.warning
          ? toast.warning(data.message || "Contatos ainda não sincronizados. Conecte o celular e aguarde.")
          : toast(data.message || "Contatos ainda não sincronizados. Conecte o celular e aguarde.");
        setImportingContacts(false);
        setTimeout(() => setImportProgress({ status: "", message: "", progress: 0 }), 5000);
      } else if (data.status === "error") {
        toast.error(data.message || "Erro ao importar contatos");
        setImportingContacts(false);
        setTimeout(() => setImportProgress({ status: "", message: "", progress: 0 }), 3000);
      }
    };

    socket.on(`company-${user.companyId}-importContacts`, onImportProgress);
    return () => {
      socket.off(`company-${user.companyId}-importContacts`, onImportProgress);
    };
  }, [user?.companyId, socket]);

  const handleimportContact = async (whatsappId) => {
    setImportContacts(false);
    setImportConnectionModalOpen(false);
    setImportingContacts(true);
    setImportProgress({ status: "started", message: "Iniciando importação...", progress: 0 });
    try {
      await api.post("/contacts/import", { whatsappId: whatsappId || undefined });
      // A resposta é imediata, o progresso vem via socket
    } catch (err) {
      toastError(err);
      setImportingContacts(false);
      setImportProgress({ status: "", message: "", progress: 0 });
    }
  };

  const handleOpenImportConnectionModal = async () => {
    try {
      const { data } = await api.get("/whatsapp", { params: { companyId: user.companyId, session: 0 } });
      const connected = data.filter(w => w.status === "CONNECTED" && (w.channel === "whatsapp" || !w.channel));
      setImportWhatsapps(connected);
      setSelectedImportWhatsappId(connected.length === 1 ? connected[0].id : "");
      setImportConnectionModalOpen(true);
    } catch (err) {
      toastError(err);
    }
  };

  const handleimportChats = async () => {
    try {
      await api.post("/contacts/import/chats");
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  // Determinar qual ação de confirmação executar para modais simples
  const getConfirmAction = () => {
    if (deletingContact) return () => handleDeleteContact(deletingContact.id);
    if (blockingContact) return () => handleBlockContact(blockingContact.id);
    if (unBlockingContact) return () => handleUnBlockContact(unBlockingContact.id);
    if (ImportContacts) return handleimportContact;
    return handleImportExcel;
  };

  // Determinar título do modal de confirmação simples
  const getConfirmTitle = () => {
    if (deletingContact) return `${i18n.t("contacts.confirmationModal.deleteTitle")} ${deletingContact.name}?`;
    if (blockingContact) return `Bloquear Contato ${blockingContact.name}?`;
    if (unBlockingContact) return `Desbloquear Contato ${unBlockingContact.name}?`;
    if (ImportContacts) return i18n.t("contacts.confirmationModal.importTitlte");
    return i18n.t("contactListItems.confirmationModal.importTitlte");
  };

  // Determinar mensagem do modal de confirmação simples
  const getConfirmMessage = () => {
    if (exportContact) return i18n.t("contacts.confirmationModal.exportContact");
    if (deletingContact) return i18n.t("contacts.confirmationModal.deleteMessage");
    if (blockingContact) return i18n.t("contacts.confirmationModal.blockContact");
    if (unBlockingContact) return i18n.t("contacts.confirmationModal.unblockContact");
    if (ImportContacts) return i18n.t("contacts.confirmationModal.importMessage");
    return i18n.t("contactListItems.confirmationModal.importMessage");
  };

  const selectedCount = getSelectedCount();
  const isAnyContactSelected = selectAllMode || selectedContacts.size > 0;

  // Status do checkbox "selecionar todos"
  const selectAllCheckboxStatus = () => {
    if (selectAllMode) return { checked: true, indeterminate: false };
    
    const currentPageIds = contacts.map(contact => contact.id);
    const selectedInCurrentPage = currentPageIds.filter(id => selectedContacts.has(id)).length;
    
    if (selectedInCurrentPage === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedInCurrentPage === currentPageIds.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  };

  const checkboxStatus = selectAllCheckboxStatus();

  if (user.showContacts !== "enabled") {
    return <ForbiddenPage />;
  }

  return (
    <>
    <MainContainer className={classes.mainContainer}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        initialContact={contactTicket}
        onClose={(ticket) => {
          handleCloseOrOpenTicket(ticket);
        }}
      />
      {useWhatsappOfficial && (
        <NewTicketOficialModal
          modalOpen={newTicketOficialModalOpen}
          initialContact={contactTicket}
          onClose={(ticket) => {
            handleCloseOrOpenTicketOficial(ticket);
          }}
        />
      )}

      {/* Modal de seleção de conexão para importação */}
      <Dialog
        open={importConnectionModalOpen}
        onClose={() => setImportConnectionModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Importar contatos do telefone</DialogTitle>
        <DialogContent>
          <Typography variant="body2" style={{ marginBottom: 16 }}>
            Selecione a conexão WhatsApp de onde deseja importar os contatos:
          </Typography>
          {importWhatsapps.length === 0 ? (
            <Typography color="error" variant="body2">
              Nenhuma conexão WhatsApp conectada encontrada.
            </Typography>
          ) : (
            <Select
              fullWidth
              displayEmpty
              variant="outlined"
              value={selectedImportWhatsappId}
              onChange={(e) => setSelectedImportWhatsappId(e.target.value)}
              renderValue={() => {
                if (selectedImportWhatsappId === "") return "Selecione uma conexão";
                const w = importWhatsapps.find(w => w.id === selectedImportWhatsappId);
                return w ? w.name : "";
              }}
            >
              {importWhatsapps.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  <WhatsApp style={{ color: "#25d366", marginRight: 8, verticalAlign: "middle" }} />
                  <ListItemText primary={`${w.name} (${w.number || "sem número"})`} />
                </MenuItem>
              ))}
            </Select>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportConnectionModalOpen(false)} color="secondary" variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={() => handleimportContact(selectedImportWhatsappId)}
            color="primary"
            variant="contained"
            disabled={!selectedImportWhatsappId || importWhatsapps.length === 0}
          >
            Importar
          </Button>
        </DialogActions>
      </Dialog>

      <ContactModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        contactId={selectedContactId}
      ></ContactModal>
      
      {/* Modal de confirmação tipada para exclusão */}
      <ContactDeleteConfirmModal
        open={deleteConfirmModalOpen}
        onClose={() => setDeleteConfirmModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        deleteType={deleteType}
        selectedCount={selectedContacts.size}
        totalCount={totalContactsCount}
      />
      
      {/* Modal para visualizar imagem de perfil */}
      <Dialog
        open={imageModalOpen}
        onClose={handleCloseImageModal}
        className={classes.imageDialog}
        maxWidth="md"
      >
        <DialogTitle className={classes.dialogTitle}>
          <span>Foto de Perfil - {selectedContactName}</span>
          <IconButton onClick={handleCloseImageModal} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage ? (
            <img
              src={selectedImage}
              alt={`Foto de perfil de ${selectedContactName}`}
              className={classes.profileImage}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px',
              color: '#666'
            }}>
              Imagem não disponível
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação simples para outras ações */}
      <ConfirmationModal
        title={getConfirmTitle()}
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={getConfirmAction()}
      >
        {getConfirmMessage()}
      </ConfirmationModal>
      
      <ConfirmationModal
        title={i18n.t("contacts.confirmationModal.importChat")}
        open={confirmChatsOpen}
        onClose={setConfirmChatsOpen}
        onConfirm={(e) => handleimportChats()}
      >
        {i18n.t("contacts.confirmationModal.wantImport")}
      </ConfirmationModal>

      <MainHeader>
        <Title>
          {i18n.t("contacts.title")} ({totalContactsCount})
          {isAnyContactSelected && (
            <span style={{ color: '#f50057', marginLeft: 8 }}>
              - {selectedCount} selecionado(s) {selectAllMode && '(TODOS)'}
            </span>
          )}
        </Title>
        <MainHeaderButtonsWrapper>
          <TagsFilter onFiltered={handleSelectedTags} />
          <TextField
            placeholder={i18n.t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="secondary" />
                </InputAdornment>
              ),
            }}
          />
          
          {/* Botões de ação em lote */}
          {isAnyContactSelected && (
            <div className={classes.bulkActions}>
              <Tooltip title={selectAllMode ? "Excluir todos os contatos" : "Excluir contatos selecionados"}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={handleBulkDeleteClick}
                >
                  {getSelectionButtonText()}
                </Button>
              </Tooltip>
            </div>
          )}

          <PopupState variant="popover" popupId="demo-popup-menu">
            {(popupState) => (
              <React.Fragment>
                <Button
                  variant="contained"
                  color="primary"
                  {...bindTrigger(popupState)}
                >
                  {i18n.t("contacts.menu.importexport")}
                  <ArrowDropDown />
                </Button>
                <Menu {...bindMenu(popupState)}>
                  <MenuItem
                    onClick={() => {
                      handleOpenImportConnectionModal();
                      popupState.close();
                    }}
                  >
                    <ContactPhone
                      fontSize="small"
                      color="primary"
                      style={{ marginRight: 10 }}
                    />
                    {i18n.t("contacts.menu.importYourPhone")}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setImportContactModalOpen(true);
                    }}
                  >
                    <Backup
                      fontSize="small"
                      color="primary"
                      style={{ marginRight: 10 }}
                    />
                    {i18n.t("contacts.menu.importToExcel")}
                  </MenuItem>
                  <Can
                    role={user.profile}
                    perform="contacts-page:deleteAllContacts"
                    yes={() => (
                      <MenuItem
                        onClick={() => {
                          handleDeleteAllClick();
                          popupState.close();
                        }}
                        style={{ color: '#f44336' }}
                      >
                        <DeleteSweep
                          fontSize="small"
                          style={{ marginRight: 10, color: '#f44336' }}
                        />
                        Excluir Todos os Contatos
                      </MenuItem>
                    )}
                  />
                </Menu>
              </React.Fragment>
            )}
          </PopupState>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenContactModal}
          >
            {i18n.t("contacts.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>


      {importContactModalOpen && (
        <ContactImportWpModal
          isOpen={importContactModalOpen}
          handleClose={() => setImportContactModalOpen(false)}
          selectedTags={selectedTags}
          hideNum={hideNum}
          userProfile={user.profile}
        />
      )}

      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <input
          style={{ display: "none" }}
          id="upload"
          name="file"
          type="file"
          accept=".xls,.xlsx"
          onChange={() => {
            setConfirmOpen(true);
          }}
          ref={fileUploadRef}
        />

        {/* Toolbar para ações em lote */}
        {isAnyContactSelected && (
          <Toolbar className={`${classes.toolbar} ${classes.toolbarHighlight}`}>
            <Typography className={classes.toolbarTitle} color="inherit" variant="subtitle1">
              {selectedCount} contato(s) selecionado(s) {selectAllMode && '(TODOS OS CONTATOS)'}
            </Typography>
            <div className={classes.bulkActions}>
              <Tooltip title="Cancelar seleção">
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedContacts(new Set());
                    setSelectAllMode(false);
                  }}
                >
                  Cancelar
                </Button>
              </Tooltip>
              <Tooltip title={selectAllMode ? "Excluir todos os contatos" : "Excluir selecionados"}>
                <IconButton
                  color="inherit"
                  onClick={handleBulkDeleteClick}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Tooltip>
            </div>
          </Toolbar>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell className={classes.checkboxCell}>
                <Checkbox
                  indeterminate={checkboxStatus.indeterminate}
                  checked={checkboxStatus.checked}
                  onChange={handleSelectAllContacts}
                  disabled={contacts.length === 0}
                  inputProps={{ 'aria-label': 'Selecionar todos os contatos' }}
                />
              </TableCell>
              <TableCell className={classes.idCell}>ID</TableCell>
              <TableCell className={classes.avatarCell} align="center">Foto</TableCell>
              <TableCell>{i18n.t("contacts.table.name")}</TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.whatsapp")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.email")}
              </TableCell>
              <TableCell align="center">{"Status"}</TableCell>
              <TableCell align="center">{i18n.t("contacts.table.wallet")}</TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {contacts.map((contact) => {
                const isSelected = selectAllMode || selectedContacts.has(contact.id);
                
                return (
                  <TableRow 
                    key={contact.id}
                    selected={isSelected}
                  >
                    <TableCell className={classes.checkboxCell}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectContact(contact.id)}
                        disabled={selectAllMode}
                        inputProps={{ 'aria-label': `Selecionar contato ${contact.name}` }}
                      />
                    </TableCell>
                    <TableCell className={classes.idCell}>{contact.id}</TableCell>
                    <TableCell className={classes.avatarCell} align="center">
                      <Avatar 
                        src={`${contact?.urlPicture}`}
                        className={classes.clickableAvatar}
                        onClick={() => handleOpenImageModal(contact?.urlPicture, contact.name)}
                      />
                    </TableCell>
                    <TableCell>{contact.name}</TableCell>
                    <TableCell align="center">
                      {enableLGPD && hideNum && user.profile === "user"
                        ? contact.isGroup
                          ? contact.number
                          : formatSerializedId(contact?.number) === null
                          ? contact.number.slice(0, -6) +
                            "**-**" +
                            contact?.number.slice(-2)
                          : formatSerializedId(contact?.number)?.slice(0, -6) +
                            "**-**" +
                            contact?.number?.slice(-2)
                        : contact.isGroup
                        ? contact.number
                        : formatSerializedId(contact?.number)}
                    </TableCell>
                    <TableCell align="center">{contact.email}</TableCell>
                    <TableCell align="center">
                      {contact.active ? (
                        <CheckCircleIcon
                          style={{ color: "green" }}
                          fontSize="small"
                        />
                      ) : (
                        <CancelIcon style={{ color: "red" }} fontSize="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {contact.contactWallets && contact.contactWallets.length > 0 
                        ? contact.contactWallets[0].wallet?.name || "Usuário não encontrado"
                        : "Não atribuído"}
                    </TableCell>
                    <TableCell align="center">
                      {contact.channel === "instagram" ? (
                        <Tooltip title="Abrir conversa">
                          <IconButton
                            size="small"
                            disabled={!contact.active}
                            onClick={() => {
                              setContactTicket(contact);
                              setNewTicketModalOpen(true);
                            }}
                          >
                            <Instagram style={{ color: "purple" }} />
                          </IconButton>
                        </Tooltip>
                      ) : contact.channel === "facebook" ? (
                        <Tooltip title="Abrir conversa">
                          <IconButton
                            size="small"
                            disabled={!contact.active}
                            onClick={() => {
                              setContactTicket(contact);
                              setNewTicketModalOpen(true);
                            }}
                          >
                            <Facebook style={{ color: "blue" }} />
                          </IconButton>
                        </Tooltip>
                      ) : useWhatsappOfficial ? (
                        <PopupState variant="popover" popupId={`whatsapp-menu-${contact.id}`}>
                          {(popupState) => (
                            <>
                              <Tooltip title="Abrir conversa">
                                <IconButton
                                  size="small"
                                  disabled={!contact.active}
                                  {...bindTrigger(popupState)}
                                >
                                  <WhatsApp style={{ color: "#128C7E" }} />
                                </IconButton>
                              </Tooltip>
                              <Menu {...bindMenu(popupState)}>
                                <MenuItem
                                  onClick={() => {
                                    popupState.close();
                                    setContactTicket(contact);
                                    setNewTicketOficialModalOpen(true);
                                  }}
                                  style={{ fontSize: 13 }}
                                >
                                  <WhatsApp style={{ color: "#128C7E", fontSize: 18, marginRight: 8 }} />
                                  API Oficial
                                </MenuItem>
                                <MenuItem
                                  onClick={() => {
                                    popupState.close();
                                    setContactTicket(contact);
                                    setNewTicketModalOpen(true);
                                  }}
                                  style={{ fontSize: 13 }}
                                >
                                  <WhatsApp style={{ color: "#25D366", fontSize: 18, marginRight: 8 }} />
                                  Baileys
                                </MenuItem>
                              </Menu>
                            </>
                          )}
                        </PopupState>
                      ) : (
                        <Tooltip title="Abrir conversa">
                          <IconButton
                            size="small"
                            disabled={!contact.active}
                            onClick={() => {
                              setContactTicket(contact);
                              setNewTicketModalOpen(true);
                            }}
                          >
                            <WhatsApp style={{ color: "#25D366" }} />
                          </IconButton>
                        </Tooltip>
                      )}

                      <IconButton
                        size="small"
                        onClick={() => hadleEditContact(contact.id)}
                      >
                        <EditIcon color="secondary" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={
                          contact.active
                            ? () => {
                                setConfirmOpen(true);
                                setBlockingContact(contact);
                              }
                            : () => {
                                setConfirmOpen(true);
                                setUnBlockingContact(contact);
                              }
                        }
                      >
                        {contact.active ? (
                          <BlockIcon color="secondary" />
                        ) : (
                          <CheckCircleIcon color="secondary" />
                        )}
                      </IconButton>
                      <Can
                        role={user.profile}
                        perform="contacts-page:deleteContact"
                        yes={() => (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setConfirmOpen(true);
                              setDeletingContact(contact);
                            }}
                          >
                            <DeleteOutlineIcon color="secondary" />
                          </IconButton>
                        )}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {loading && <TableRowSkeleton avatar columns={9} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>

      {/* Modal de progresso de importação de contatos do celular */}
      <Dialog
        open={importingContacts}
        disableBackdropClick
        disableEscapeKeyDown
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Importando Contatos</DialogTitle>
        <DialogContent style={{ textAlign: "center", padding: "30px 20px" }}>
          {importProgress.progress > 0 ? (
            <>
              <Box style={{ width: "100%", marginBottom: 16 }}>
                <LinearProgress variant="determinate" value={importProgress.progress} style={{ height: 10, borderRadius: 5 }} />
              </Box>
              <Typography variant="body1" style={{ marginBottom: 8, fontWeight: 500 }}>
                {importProgress.progress}%
              </Typography>
            </>
          ) : (
            <CircularProgress size={60} style={{ marginBottom: 20 }} />
          )}
          <Typography variant="body1" style={{ marginBottom: 8 }}>
            {importProgress.message || "Importando contatos do celular..."}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Por favor, aguarde. A importação está sendo processada.
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Contacts;