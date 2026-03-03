import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import Compressor from "compressorjs";
import api from "../../services/api";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import CircularProgress from "@material-ui/core/CircularProgress";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

import { i18n } from "../../translate/i18n";
import MessageVariablesPicker from "../MessageVariablesPicker";

import {
  Box,
  Chip,
  Stack,
} from "@mui/material";
import {
  AddCircle,
  Delete,
  FormatListBulleted,
  Info,
  SmartButton,
  TouchApp,
} from "@mui/icons-material";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
}));

const FlowBuilderInteractiveModal = ({
  open,
  onSave,
  onUpdate,
  data,
  close,
}) => {
  const classes = useStyles();
  const messageRef = useRef(null);
  const footerRef = useRef(null);

  const [activeModal, setActiveModal] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [interactiveType, setInteractiveType] = useState("button");
  const [message, setMessage] = useState("");
  const [footer, setFooter] = useState("");
  const [headerImage, setHeaderImage] = useState(""); // nome do arquivo no servidor
  const [headerImagePreview, setHeaderImagePreview] = useState(""); // preview local ou URL do backend
  const [headerImageMedias, setHeaderImageMedias] = useState([]);
  const [headerImageLoading, setHeaderImageLoading] = useState(false);
  const [listButtonText, setListButtonText] = useState("Selecionar");
  const [arrayOption, setArrayOption] = useState([]);

  const [labels, setLabels] = useState({
    title: "Mensagem Interativa (Baileys)",
    btn: "Adicionar",
  });

  const maxOptions = 3;

  useEffect(() => {
    if (open === "edit") {
      setLabels({
        title: "Editar Mensagem Interativa",
        btn: "Salvar",
      });
      setMessage(data.data.message || "");
      setFooter(data.data.footer || "");
      setHeaderImage(data.data.headerImage || "");
      setHeaderImagePreview(data.data.headerImage ? process.env.REACT_APP_BACKEND_URL + '/public/' + data.data.headerImage : "");
      setHeaderImageMedias([]);
      setInteractiveType("button");
      setListButtonText(data.data.listButtonText || "Selecionar");
      setArrayOption((data.data.arrayOption || []).slice(0, 3));
      setActiveModal(true);
    } else if (open === "create") {
      setLabels({
        title: "Mensagem Interativa (Baileys)",
        btn: "Adicionar",
      });
      setMessage("");
      setFooter("");
      setHeaderImage("");
      setHeaderImagePreview("");
      setHeaderImageMedias([]);
      setInteractiveType("button");
      setListButtonText("Selecionar");
      setArrayOption([]);
      setTabIndex(0);
      setActiveModal(true);
    } else {
      setActiveModal(false);
    }
  }, [open]);

  const handleClose = () => {
    close(null);
    setActiveModal(false);
  };

  const handleSave = async () => {
    if (!message.trim()) {
      toast.error("O corpo da mensagem é obrigatório!");
      return;
    }
    if (arrayOption.length === 0) {
      toast.error("Adicione pelo menos uma opção!");
      return;
    }

    let finalHeaderImage = headerImage;

    // Upload new image if selected
    if (headerImageMedias.length > 0) {
      setHeaderImageLoading(true);
      try {
        const formData = new FormData();
        formData.append("fromMe", true);
        const file = headerImageMedias[0];
        
        await new Promise((resolve, reject) => {
          if (file.type.split("/")[0] === "image") {
            new Compressor(file, {
              quality: 0.7,
              success(compressed) {
                formData.append("medias", compressed);
                formData.append("body", compressed.name);
                resolve();
              },
              error(err) { reject(err); }
            });
          } else {
            formData.append("medias", file);
            formData.append("body", file.name);
            resolve();
          }
        });

        const res = await api.post("/flowbuilder/img", formData);
        finalHeaderImage = res.data.name;
      } catch (err) {
        toast.error("Erro ao enviar imagem");
        setHeaderImageLoading(false);
        return;
      }
      setHeaderImageLoading(false);
    }

    const payload = {
      message,
      footer,
      headerImage: finalHeaderImage,
      interactiveType: "button",
      listButtonText,
      arrayOption,
    };

    if (open === "edit") {
      handleClose();
      onUpdate({
        ...data,
        data: payload,
      });
    } else {
      handleClose();
      onSave(payload);
    }
  };

  const handleHeaderImageChange = (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    if (e.target.files[0].size > 2000000) {
      toast.error("Arquivo muito grande! Máximo 2MB");
      return;
    }
    setHeaderImagePreview(URL.createObjectURL(e.target.files[0]));
    setHeaderImageMedias(Array.from(e.target.files));
  };

  const handleRemoveHeaderImage = () => {
    setHeaderImage("");
    setHeaderImagePreview("");
    setHeaderImageMedias([]);
  };

  const addOption = () => {
    if (arrayOption.length >= maxOptions) {
      toast.warning(
        `Limite máximo de ${maxOptions} opções para botões!`
      );
      return;
    }
    setArrayOption((old) => [
      ...old,
      { number: old.length + 1, value: "" },
    ]);
  };

  const removeOption = (number) => {
    setArrayOption((old) => {
      const filtered = old.filter((item) => item.number !== number);
      return filtered.map((item, idx) => ({ ...item, number: idx + 1 }));
    });
  };

  const updateOptionValue = (index, value) => {
    setArrayOption((old) => {
      const newArr = [...old];
      newArr[index] = { ...newArr[index], value };
      return newArr;
    });
  };

  const handleAddVariable = (value) => {
    const input = messageRef.current?.querySelector("textarea");
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newMessage = message.substring(0, start) + value + message.substring(end);
      setMessage(newMessage);
      setTimeout(() => {
        input.selectionStart = start + value.length;
        input.selectionEnd = start + value.length;
        input.focus();
      }, 50);
    } else {
      setMessage((prev) => prev + value);
    }
  };

  const handleAddFooterVariable = (value) => {
    const input = footerRef.current?.querySelector("input");
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newFooter = footer.substring(0, start) + value + footer.substring(end);
      setFooter(newFooter);
      setTimeout(() => {
        input.selectionStart = start + value.length;
        input.selectionEnd = start + value.length;
        input.focus();
      }, 50);
    } else {
      setFooter((prev) => prev + value);
    }
  };

  // Preview component
  const Preview = () => (
    <Box
      sx={{
        backgroundColor: "#FFF8E1",
        border: "1px solid #FFE082",
        borderRadius: "8px",
        padding: "12px",
        mt: 2,
      }}
    >
      <Stack direction="row" alignItems="center" gap={1} mb={1}>
        <TouchApp sx={{ color: "#9C27B0", fontSize: 18 }} />
        <Typography
          style={{ fontWeight: 600, fontSize: "13px", color: "#333" }}
        >
          Pré-visualização
        </Typography>
      </Stack>
      <Box
        sx={{
          backgroundColor: "#e1ffc7",
          borderRadius: "8px",
          padding: "10px 14px",
          maxWidth: "300px",
        }}
      >
        {headerImagePreview && (
          <img
            src={headerImagePreview}
            alt="Header"
            style={{ width: "100%", borderRadius: "6px", marginBottom: "8px", maxHeight: "120px", objectFit: "cover" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}
        <Typography style={{ fontSize: "13px", color: "#333" }}>
          {message || "Corpo da mensagem..."}
        </Typography>
        {footer && (
          <Typography
            style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}
          >
            {footer}
          </Typography>
        )}
      </Box>
      {interactiveType === "button" && arrayOption.length > 0 && (
        <Stack gap={0.5} mt={1} maxWidth="300px">
          {arrayOption.map((opt) => (
            <Box
              key={opt.number}
              sx={{
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                borderRadius: "6px",
                padding: "6px 12px",
                textAlign: "center",
              }}
            >
              <Typography
                style={{
                  fontSize: "12px",
                  color: "#00a5f4",
                  fontWeight: 600,
                }}
              >
                {opt.value || `Botão ${opt.number}`}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
      {interactiveType === "list" && arrayOption.length > 0 && (
        <Box
          sx={{
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "8px 12px",
            textAlign: "center",
            mt: 1,
            maxWidth: "300px",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="center" gap={0.5}>
            <FormatListBulleted sx={{ fontSize: 14, color: "#00a5f4" }} />
            <Typography
              style={{
                fontSize: "12px",
                color: "#00a5f4",
                fontWeight: 600,
              }}
            >
              {listButtonText || "Selecionar"}
            </Typography>
          </Stack>
        </Box>
      )}
    </Box>
  );

  return (
    <div className={classes.root}>
      <Dialog
        open={activeModal}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        scroll="paper"
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <TouchApp sx={{ color: "#9C27B0" }} />
            <span>{labels.title}</span>
            <Chip
              label="Baileys"
              size="small"
              sx={{
                backgroundColor: "#9C27B0",
                color: "#fff",
                fontSize: "10px",
                height: "20px",
              }}
            />
          </Stack>
        </DialogTitle>

        <Box sx={{ px: 2 }}>
          {/* Type selector */}
          <Typography
            variant="body2"
            style={{ marginBottom: 4, color: "#555" }}
          >
            Tipo de mensagem interativa
          </Typography>
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ mb: 0.5 }}>
            <SmartButton sx={{ fontSize: 16, color: "#1976D2" }} />
            <span>Botões (máx. 3)</span>
          </Stack>

          {/* Info banner */}
          <Box
            sx={{
              backgroundColor: "#E3F2FD",
              borderRadius: "6px",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              mb: 2,
              mt: 1,
            }}
          >
            <Info sx={{ color: "#1976D2", fontSize: 18 }} />
            <Typography style={{ fontSize: "12px", color: "#333" }}>
              Botões interativos via Baileys (nativeFlowMessage). Funciona em conexões não-oficiais. Limite de 3 botões.
            </Typography>
          </Box>
        </Box>

        <DialogContent dividers>
          {/* Tabs */}
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="CONTEÚDO DA MENSAGEM" />
            <Tab
              label={`BOTÕES (${arrayOption.length}/${maxOptions})`}
            />
          </Tabs>

          {/* Tab 0: Message content */}
          {tabIndex === 0 && (
            <Stack gap={2} mt={2}>
              <MessageVariablesPicker
                onClick={handleAddVariable}
                disabled={false}
              />
              <div ref={messageRef}>
                <TextField
                  label="Corpo da mensagem"
                  multiline
                  rows={4}
                  variant="outlined"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  fullWidth
                  required
                />
              </div>
              <MessageVariablesPicker
                onClick={handleAddFooterVariable}
                disabled={false}
              />
              <div ref={footerRef}>
                <TextField
                  label="Rodapé (opcional)"
                  variant="outlined"
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  fullWidth
                  size="small"
                />
              </div>
              {/* Header image upload */}
              <Box sx={{ border: "1px dashed #ccc", borderRadius: "6px", padding: "12px", textAlign: "center" }}>
                <Typography style={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
                  Imagem de cabeçalho (opcional)
                </Typography>
                {headerImagePreview && (
                  <Box sx={{ mb: 1, position: "relative", display: "inline-block" }}>
                    <img
                      src={headerImagePreview}
                      alt="Preview"
                      style={{ maxWidth: "200px", maxHeight: "100px", borderRadius: "6px", objectFit: "cover" }}
                    />
                    <IconButton
                      size="small"
                      onClick={handleRemoveHeaderImage}
                      sx={{ position: "absolute", top: -8, right: -8, backgroundColor: "#fff", boxShadow: 1 }}
                    >
                      <Delete fontSize="small" color="error" />
                    </IconButton>
                  </Box>
                )}
                {!headerImageLoading && (
                  <Button variant="outlined" component="label" size="small">
                    {headerImagePreview ? "Trocar imagem" : "Enviar imagem"}
                    <input
                      type="file"
                      accept="image/png, image/jpg, image/jpeg"
                      hidden
                      onChange={handleHeaderImageChange}
                    />
                  </Button>
                )}
                {headerImageLoading && <CircularProgress size={24} />}
              </Box>
              {interactiveType === "list" && (
                <TextField
                  label="Texto do botão da lista"
                  variant="outlined"
                  value={listButtonText}
                  onChange={(e) => setListButtonText(e.target.value)}
                  fullWidth
                  size="small"
                  helperText="Texto exibido no botão que abre a lista"
                />
              )}
              <Preview />
            </Stack>
          )}

          {/* Tab 1: Options */}
          {tabIndex === 1 && (
            <Stack gap={2} mt={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography style={{ fontWeight: 500 }}>
                  {interactiveType === "button" ? "Botões" : "Opções da lista"}
                </Typography>
                <Button
                  onClick={addOption}
                  color="primary"
                  variant="contained"
                  size="small"
                  startIcon={<AddCircle />}
                  disabled={arrayOption.length >= maxOptions}
                >
                  Adicionar
                </Button>
              </Stack>

              {arrayOption.length === 0 && (
                <Box
                  sx={{
                    backgroundColor: "#FFF3E0",
                    border: "1px solid #FFE0B2",
                    borderRadius: "6px",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Typography style={{ fontSize: "13px", color: "#E65100" }}>
                    ⚠ Adicione pelo menos uma opção.
                  </Typography>
                </Box>
              )}

              {arrayOption.map((item, index) => (
                <Stack
                  key={item.number}
                  direction="row"
                  alignItems="center"
                  gap={1}
                >
                  <Chip
                    label={item.number}
                    size="small"
                    sx={{
                      backgroundColor: interactiveType === "button" ? "#388E3C" : "#1976D2",
                      color: "#fff",
                      fontWeight: 600,
                      minWidth: "28px",
                    }}
                  />
                  <TextField
                    placeholder={
                      interactiveType === "button"
                        ? `Texto do botão ${item.number}`
                        : `Opção ${item.number}`
                    }
                    variant="outlined"
                    size="small"
                    value={item.value}
                    onChange={(e) => updateOptionValue(index, e.target.value)}
                    fullWidth
                    inputProps={{
                      maxLength: interactiveType === "button" ? 20 : 24,
                    }}
                    helperText={
                      interactiveType === "button"
                        ? `${(item.value || "").length}/20`
                        : `${(item.value || "").length}/24`
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeOption(item.number)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              ))}

              <Preview />
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="secondary" variant="outlined">
            Cancelar
          </Button>
          <Button
            color="primary"
            variant="contained"
            className={classes.btnWrapper}
            onClick={handleSave}
          >
            {labels.btn}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FlowBuilderInteractiveModal;
