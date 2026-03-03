import React, { useState, useEffect, useContext, useCallback } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper, Button, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, TextField, InputAdornment, Grid, Select, MenuItem,
  FormControl, InputLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, Box, Typography, CircularProgress, Tooltip,
  Divider
} from "@material-ui/core";
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  Cancel as RejectedIcon,
  Visibility as ViewIcon,
  Edit as EditIcon
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import ConfirmationModal from "../../components/ConfirmationModal";
import { AuthContext } from "../../context/Auth/AuthContext";
import TableRowSkeleton from "../../components/TableRowSkeleton";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  formControl: {
    minWidth: 200,
  },
  statusApproved: { color: "#4caf50" },
  statusPending: { color: "#ff9800" },
  statusRejected: { color: "#f44336" },
  componentBox: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  previewBox: {
    backgroundColor: "#e5ddd5",
    borderRadius: 8,
    padding: theme.spacing(2),
    maxWidth: 400,
  },
  previewBubble: {
    backgroundColor: "#dcf8c6",
    borderRadius: 8,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
  }
}));

const CATEGORIES = [
  { value: "MARKETING", label: "Marketing" },
  { value: "UTILITY", label: "Utilidade" },
  { value: "AUTHENTICATION", label: "Autenticação" },
];

const LANGUAGES = [
  { value: "pt_BR", label: "Português (BR)" },
  { value: "en_US", label: "English (US)" },
  { value: "es", label: "Español" },
];

const TemplateManager = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [whatsapps, setWhatsapps] = useState([]);
  const [selectedWhatsappId, setSelectedWhatsappId] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("MARKETING");
  const [templateLanguage, setTemplateLanguage] = useState("pt_BR");
  const [headerText, setHeaderText] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch official whatsapp connections
  useEffect(() => {
    const fetchWhatsapps = async () => {
      try {
        const { data } = await api.get("/whatsapp/?session=0");
        const oficial = data.filter(w => w.channel === "whatsapp_oficial");
        setWhatsapps(oficial);
        if (oficial.length > 0 && !selectedWhatsappId) {
          setSelectedWhatsappId(oficial[0].id);
        }
      } catch (err) {
        toastError(err);
      }
    };
    fetchWhatsapps();
  }, []);

  // Fetch templates when whatsapp changes
  const fetchTemplates = useCallback(async () => {
    if (!selectedWhatsappId) return;
    setLoading(true);
    try {
      const { data } = await api.get("/quick-messages/list", {
        params: {
          companyId: user.companyId,
          isOficial: "true",
          whatsappId: selectedWhatsappId
        }
      });
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, [selectedWhatsappId, user.companyId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Listen for template status change notifications via socket
  useEffect(() => {
    if (!user?.companyId) return;
    
    // Import socket from context if available
    const handleStatusChange = (data) => {
      if (data.action === "statusChange" && data.changes) {
        data.changes.forEach(change => {
          const statusLabel = {
            APPROVED: "✅ APROVADO",
            REJECTED: "❌ REJEITADO",
            PENDING: "⏳ PENDENTE",
            PAUSED: "⏸️ PAUSADO",
          };
          const newLabel = statusLabel[change.newStatus] || change.newStatus;
          const oldLabel = statusLabel[change.oldStatus] || change.oldStatus;

          if (change.newStatus === "APPROVED") {
            toast.success(`Template "${change.name}" foi ${newLabel}! 🎉`, { autoClose: 8000 });
          } else if (change.newStatus === "REJECTED") {
            toast.error(`Template "${change.name}" foi ${newLabel}`, { autoClose: 10000 });
          } else {
            toast.info(`Template "${change.name}": ${oldLabel} → ${newLabel}`, { autoClose: 6000 });
          }
        });
        // Refresh templates list
        fetchTemplates();
      }
    };

    // We'll handle notifications from the sync response instead
    return () => {};
  }, [user?.companyId, fetchTemplates]);

  const handleSync = async () => {
    if (!selectedWhatsappId) return;
    setSyncing(true);
    try {
      const { data } = await api.get(`/whatsapp/sync-templates/${selectedWhatsappId}`);
      
      // Show status change notifications
      if (data.statusChanges && data.statusChanges.length > 0) {
        data.statusChanges.forEach(change => {
          if (change.newStatus === "APPROVED") {
            toast.success(`🎉 Template "${change.name}" foi APROVADO pela Meta!`, { autoClose: 8000 });
          } else if (change.newStatus === "REJECTED") {
            toast.error(`❌ Template "${change.name}" foi REJEITADO pela Meta`, { autoClose: 10000 });
          } else {
            toast.info(`Template "${change.name}": ${change.oldStatus} → ${change.newStatus}`, { autoClose: 6000 });
          }
        });
        toast.success(`Sincronização concluída - ${data.statusChanges.length} template(s) com mudança de status`);
      } else {
        toast.success("Templates sincronizados - nenhuma mudança de status");
      }
      
      await fetchTemplates();
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "";
      if (errMsg.includes("TOKEN_EXPIRED") || errMsg.includes("token") && (errMsg.includes("expirou") || errMsg.includes("inválido"))) {
        toast.error("⚠️ Token da API Oficial expirado ou inválido! Atualize o token de acesso da Meta na configuração da conexão.", { autoClose: 12000 });
      } else {
        toastError(err);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName || !bodyText) {
      toast.error("Nome e corpo da mensagem são obrigatórios");
      return;
    }

    // Validate template name (only lowercase, numbers and underscores)
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(templateName)) {
      toast.error("O nome do template deve conter apenas letras minúsculas, números e underscores (_)");
      return;
    }

    setSubmitting(true);
    try {
      const components = [];

      if (headerText) {
        components.push({ type: "HEADER", format: "TEXT", text: headerText });
      }

      components.push({ type: "BODY", text: bodyText });

      if (footerText) {
        components.push({ type: "FOOTER", text: footerText });
      }

      if (buttons.length > 0) {
        components.push({
          type: "BUTTONS",
          buttons: buttons.map(b => ({
            type: b.type,
            text: b.text,
            ...(b.type === "URL" ? { url: b.url } : {}),
            ...(b.type === "PHONE_NUMBER" ? { phone_number: b.phone } : {})
          }))
        });
      }

      await api.post(`/whatsapp/${selectedWhatsappId}/create-template`, {
        name: templateName,
        language: templateLanguage,
        category: templateCategory,
        components
      });

      toast.success("Template enviado para aprovação da Meta!");
      setCreateModalOpen(false);
      resetForm();

      // Sync to get latest status
      await handleSync();
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "";
      if (errMsg.includes("TOKEN_EXPIRED") || (errMsg.includes("token") && (errMsg.includes("expirou") || errMsg.includes("inválido")))) {
        toast.error("⚠️ Token da API Oficial expirado ou inválido! Atualize o token de acesso da Meta na configuração da conexão.", { autoClose: 12000 });
      } else {
        toastError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;
    try {
      await api.delete(`/whatsapp/${selectedWhatsappId}/delete-template/${deletingTemplate.shortcode}`);
      toast.success("Template excluído com sucesso!");
      setConfirmModalOpen(false);
      setDeletingTemplate(null);
      await fetchTemplates();
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "";
      if (errMsg.includes("TOKEN_EXPIRED") || (errMsg.includes("token") && (errMsg.includes("expirou") || errMsg.includes("inválido")))) {
        toast.error("⚠️ Token da API Oficial expirado ou inválido! Atualize o token de acesso da Meta na configuração da conexão.", { autoClose: 12000 });
      } else {
        toastError(err);
      }
    }
  };

  const handleEditTemplate = (template) => {
    // Pre-fill the create form with existing template data for re-creation
    setTemplateName(template.shortcode || "");
    setTemplateCategory(template.category || "MARKETING");
    setTemplateLanguage(template.language || "pt_BR");
    
    // Parse components if available
    if (template.components && template.components.length > 0) {
      const header = template.components.find(c => c.type === "HEADER");
      const body = template.components.find(c => c.type === "BODY");
      const footer = template.components.find(c => c.type === "FOOTER");
      const btns = template.components.find(c => c.type === "BUTTONS");

      setHeaderText(header?.text || "");
      setBodyText(body?.text || "");
      setFooterText(footer?.text || "");

      if (btns?.buttons) {
        const parsed = typeof btns.buttons === "string" ? JSON.parse(btns.buttons) : btns.buttons;
        setButtons((parsed || []).map(b => ({
          type: b.type || "QUICK_REPLY",
          text: b.text || "",
          url: b.url || "",
          phone: b.phone_number || ""
        })));
      } else {
        setButtons([]);
      }
    } else {
      setHeaderText("");
      setBodyText(template.message || "");
      setFooterText("");
      setButtons([]);
    }

    setCreateModalOpen(true);
  };

  const resetForm = () => {
    setTemplateName("");
    setTemplateCategory("MARKETING");
    setTemplateLanguage("pt_BR");
    setHeaderText("");
    setBodyText("");
    setFooterText("");
    setButtons([]);
  };

  const addButton = (type) => {
    if (buttons.length >= 3) {
      toast.warning("Máximo de 3 botões permitidos");
      return;
    }
    setButtons([...buttons, { type, text: "", url: "", phone: "" }]);
  };

  const updateButton = (index, field, value) => {
    const updated = [...buttons];
    updated[index][field] = value;
    setButtons(updated);
  };

  const removeButton = (index) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
        return <Chip icon={<CheckCircleIcon />} label="Aprovado" size="small" style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }} />;
      case "PENDING":
        return <Chip icon={<PendingIcon />} label="Pendente" size="small" style={{ backgroundColor: "#fff3e0", color: "#e65100" }} />;
      case "REJECTED":
        return <Chip icon={<RejectedIcon />} label="Rejeitado" size="small" style={{ backgroundColor: "#ffebee", color: "#c62828" }} />;
      default:
        return <Chip label={status || "N/A"} size="small" />;
    }
  };

  const getCategoryLabel = (cat) => {
    const found = CATEGORIES.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  const filteredTemplates = templates.filter(t =>
    !searchParam || t.shortcode?.toLowerCase().includes(searchParam.toLowerCase())
  );

  return (
    <MainContainer>
      <ConfirmationModal
        title={`Excluir template "${deletingTemplate?.shortcode}"?`}
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleDeleteTemplate}
      >
        Esta ação irá excluir o template na Meta e localmente. Deseja continuar?
      </ConfirmationModal>

      {/* View Modal */}
      <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Detalhes do Template</DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">Nome</Typography>
                  <Typography>{selectedTemplate.shortcode}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2" color="textSecondary">Idioma</Typography>
                  <Typography>{selectedTemplate.language || "pt_BR"}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  {getStatusIcon(selectedTemplate.status)}
                </Grid>
              </Grid>
              <Box mt={2}>
                <Typography variant="subtitle2" color="textSecondary">Categoria</Typography>
                <Typography>{getCategoryLabel(selectedTemplate.category)}</Typography>
              </Box>
              {selectedTemplate.components && selectedTemplate.components.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>Componentes</Typography>
                  <Box className={classes.previewBox}>
                    {selectedTemplate.components.map((comp, i) => (
                      <Box key={i} mb={1}>
                        {comp.type === "HEADER" && (
                          <Typography variant="subtitle1" style={{ fontWeight: 700 }}>{comp.text}</Typography>
                        )}
                        {comp.type === "BODY" && (
                          <Box className={classes.previewBubble}>
                            <Typography style={{ whiteSpace: "pre-wrap" }}>{comp.text}</Typography>
                          </Box>
                        )}
                        {comp.type === "FOOTER" && (
                          <Typography variant="caption" color="textSecondary">{comp.text}</Typography>
                        )}
                        {comp.type === "BUTTONS" && comp.buttons && (
                          <Box mt={1}>
                            {(typeof comp.buttons === "string" ? JSON.parse(comp.buttons) : comp.buttons).map((btn, j) => (
                              <Button key={j} variant="outlined" size="small" fullWidth style={{ marginBottom: 4 }}>
                                {btn.text}
                              </Button>
                            ))}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewModalOpen(false)} color="primary">Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Criar Novo Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Nome do Template"
                fullWidth
                margin="dense"
                variant="outlined"
                value={templateName}
                onChange={e => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                helperText="Apenas letras minúsculas, números e _"
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>Categoria</InputLabel>
                <Select value={templateCategory} onChange={e => setTemplateCategory(e.target.value)} label="Categoria">
                  {CATEGORIES.map(c => (
                    <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>Idioma</InputLabel>
                <Select value={templateLanguage} onChange={e => setTemplateLanguage(e.target.value)} label="Idioma">
                  {LANGUAGES.map(l => (
                    <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider style={{ margin: "16px 0" }} />

          <TextField
            label="Cabeçalho (opcional)"
            fullWidth
            margin="dense"
            variant="outlined"
            value={headerText}
            onChange={e => setHeaderText(e.target.value)}
            helperText="Texto exibido no topo do template"
          />

          <TextField
            label="Corpo da Mensagem"
            fullWidth
            margin="dense"
            variant="outlined"
            multiline
            rows={4}
            value={bodyText}
            onChange={e => setBodyText(e.target.value)}
            helperText="Use {{1}}, {{2}}, etc. para variáveis. Ex: Olá {{1}}, seu pedido {{2}} está pronto!"
            required
          />

          <TextField
            label="Rodapé (opcional)"
            fullWidth
            margin="dense"
            variant="outlined"
            value={footerText}
            onChange={e => setFooterText(e.target.value)}
            helperText="Texto pequeno no final do template"
          />

          <Divider style={{ margin: "16px 0" }} />

          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2">Botões (opcional - máx 3)</Typography>
            <Box>
              <Button size="small" onClick={() => addButton("QUICK_REPLY")} style={{ marginRight: 8 }}>
                + Resposta Rápida
              </Button>
              <Button size="small" onClick={() => addButton("URL")}>
                + Link
              </Button>
              <Button size="small" onClick={() => addButton("PHONE_NUMBER")} style={{ marginLeft: 8 }}>
                + Telefone
              </Button>
            </Box>
          </Box>

          {buttons.map((btn, i) => (
            <Box key={i} className={classes.componentBox}>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={3}>
                  <Chip label={btn.type === "QUICK_REPLY" ? "Resp. Rápida" : btn.type === "URL" ? "Link" : "Telefone"} size="small" />
                </Grid>
                <Grid item xs={btn.type === "QUICK_REPLY" ? 8 : 4}>
                  <TextField
                    size="small"
                    label="Texto"
                    fullWidth
                    value={btn.text}
                    onChange={e => updateButton(i, "text", e.target.value)}
                  />
                </Grid>
                {btn.type === "URL" && (
                  <Grid item xs={4}>
                    <TextField
                      size="small"
                      label="URL"
                      fullWidth
                      value={btn.url}
                      onChange={e => updateButton(i, "url", e.target.value)}
                    />
                  </Grid>
                )}
                {btn.type === "PHONE_NUMBER" && (
                  <Grid item xs={4}>
                    <TextField
                      size="small"
                      label="Telefone"
                      fullWidth
                      value={btn.phone}
                      onChange={e => updateButton(i, "phone", e.target.value)}
                    />
                  </Grid>
                )}
                <Grid item xs={1}>
                  <IconButton size="small" onClick={() => removeButton(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          ))}

          {/* Preview */}
          {bodyText && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>Pré-visualização</Typography>
              <Box className={classes.previewBox}>
                {headerText && (
                  <Typography variant="subtitle1" style={{ fontWeight: 700, marginBottom: 4 }}>{headerText}</Typography>
                )}
                <Box className={classes.previewBubble}>
                  <Typography style={{ whiteSpace: "pre-wrap" }}>{bodyText}</Typography>
                </Box>
                {footerText && (
                  <Typography variant="caption" color="textSecondary">{footerText}</Typography>
                )}
                {buttons.length > 0 && (
                  <Box mt={1}>
                    {buttons.map((btn, i) => (
                      <Button key={i} variant="outlined" size="small" fullWidth style={{ marginBottom: 4 }}>
                        {btn.text || `Botão ${i + 1}`}
                      </Button>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateModalOpen(false); resetForm(); }}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreateTemplate}
            color="primary"
            variant="contained"
            disabled={submitting || !templateName || !bodyText}
          >
            {submitting ? <CircularProgress size={24} /> : "Enviar para Aprovação"}
          </Button>
        </DialogActions>
      </Dialog>

      <MainHeader>
        <Grid style={{ width: "99.6%" }} container>
          <Grid xs={12} sm={5} item>
            <Title>Gerenciamento de Templates</Title>
          </Grid>
          <Grid xs={12} sm={7} item>
            <Grid spacing={2} container alignItems="center">
              <Grid xs={4} item>
                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel>Conexão</InputLabel>
                  <Select
                    value={selectedWhatsappId}
                    onChange={e => setSelectedWhatsappId(e.target.value)}
                    label="Conexão"
                  >
                    {whatsapps.map(w => (
                      <MenuItem key={w.id} value={w.id}>
                        {w.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={3} item>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar..."
                  type="search"
                  value={searchParam}
                  onChange={e => setSearchParam(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon style={{ color: "gray" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid xs={2} item>
                <Tooltip title="Sincronizar com Meta">
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleSync}
                    disabled={syncing || !selectedWhatsappId}
                    startIcon={syncing ? <CircularProgress size={18} /> : <SyncIcon />}
                  >
                    Sync
                  </Button>
                </Tooltip>
              </Grid>
              <Grid xs={3} item>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={() => setCreateModalOpen(true)}
                  disabled={!selectedWhatsappId}
                  startIcon={<AddIcon />}
                >
                  Criar Template
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </MainHeader>

      <Paper className={classes.mainPaper} variant="outlined">
        {whatsapps.length === 0 && !loading ? (
          <Box p={4} textAlign="center">
            <Typography color="textSecondary">
              Nenhuma conexão de API Oficial encontrada. Adicione uma conexão oficial para gerenciar templates.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell align="center">Categoria</TableCell>
                <TableCell align="center">Idioma</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>{template.shortcode}</TableCell>
                  <TableCell align="center">
                    <Chip label={getCategoryLabel(template.category)} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">{template.language || "pt_BR"}</TableCell>
                  <TableCell align="center">{getStatusIcon(template.status)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver detalhes">
                      <IconButton size="small" onClick={() => { setSelectedTemplate(template); setViewModalOpen(true); }}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar (recriar template)">
                      <IconButton size="small" onClick={() => handleEditTemplate(template)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir template">
                      <IconButton size="small" onClick={() => { setDeletingTemplate(template); setConfirmModalOpen(true); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={5} />}
              {!loading && filteredTemplates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary" style={{ padding: 16 }}>
                      Nenhum template encontrado. Clique em "Sync" para sincronizar ou "Criar Template" para criar um novo.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>
    </MainContainer>
  );
};

export default TemplateManager;
