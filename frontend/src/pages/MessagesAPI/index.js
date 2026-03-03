import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import {
  Button,
  CircularProgress,
  Grid,
  TextField,
  Typography,
  Divider,
  Chip,
  Box,
} from "@material-ui/core";
import { Field, Form, Formik } from "formik";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import axios from "axios";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    paddingBottom: 100,
  },
  sectionTitle: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1),
    fontWeight: "bold",
  },
  elementMargin: {
    padding: theme.spacing(2),
  },
  formContainer: {
    maxWidth: 500,
  },
  textRight: {
    textAlign: "right",
  },
  endpointBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    padding: theme.spacing(1.5),
    fontFamily: "monospace",
    fontSize: 13,
    wordBreak: "break-all",
    marginBottom: theme.spacing(1),
    border: "1px solid #ddd",
  },
  chip: {
    marginRight: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
  },
  sectionDivider: {
    margin: theme.spacing(3, 0),
  },
  badgeNew: {
    backgroundColor: "#4caf50",
    color: "#fff",
    borderRadius: 4,
    padding: "2px 6px",
    fontSize: 11,
    fontWeight: "bold",
    marginLeft: 8,
    verticalAlign: "middle",
  },
  codeBlock: {
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
    borderRadius: 6,
    padding: theme.spacing(2),
    fontFamily: "monospace",
    fontSize: 12,
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    marginTop: theme.spacing(1),
  },
}));

const MessagesAPI = () => {
  const classes = useStyles();
  const history = useHistory();
  const [file, setFile] = useState({});
  const { user } = useContext(AuthContext);
  const { getPlanCompany } = usePlans();
  const [bulkMessages, setBulkMessages] = useState("");

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useExternalApi) {
        toast.error("Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando.");
        setTimeout(() => history.push(`/`), 1000);
      }
    }
    fetchData();
  }, []);

  const getEndpoint = () => process.env.REACT_APP_BACKEND_URL + "/api/messages/send";
  const getCheckEndpoint = () => process.env.REACT_APP_BACKEND_URL + "/api/messages/checkNumber";
  const getNoTicketEndpoint = () => process.env.REACT_APP_BACKEND_URL + "/api/messages/send/noTicket";
  const getBulkEndpoint = () => process.env.REACT_APP_BACKEND_URL + "/api/messages/send/bulk";
  const getLinkImageEndpoint = () => process.env.REACT_APP_BACKEND_URL + "/api/messages/send/linkImage";
  const getConnectionsEndpoint = () => process.env.REACT_APP_BACKEND_URL + "/api/messages/connections";
  const getButtonsEndpoint = () => process.env.REACT_APP_BACKEND_URL + "/api/messages/send/buttons";

  const handleSendTextMessage = async (values) => {
    const { number, body, userId, queueId } = values;
    try {
      await axios.post(getEndpoint(), { number, body, userId, queueId }, {
        headers: { "Content-type": "application/json", Authorization: `Bearer ${values.token}` },
      });
      toast.success("Mensagem enviada com sucesso");
    } catch (err) { toastError(err); }
  };

  const handleSendMediaMessage = async (values) => {
    try {
      const firstFile = file[0];
      const data = new FormData();
      data.append("number", values.number);
      data.append("body", values.body ? values.body : firstFile.name);
      data.append("userId", values.userId);
      data.append("queueId", values.queueId);
      data.append("medias", firstFile);
      await axios.post(getEndpoint(), data, {
        headers: { "Content-type": "multipart/form-data", Authorization: `Bearer ${values.token}` },
      });
      toast.success("Mensagem enviada com sucesso");
    } catch (err) { toastError(err); }
  };

  const handleCheckNumber = async (values) => {
    try {
      const res = await axios.post(getCheckEndpoint(), { number: values.number }, {
        headers: { "Content-type": "application/json", Authorization: `Bearer ${values.token}` },
      });
      if (res.data.existsInWhatsapp) {
        toast.success(`✅ Número existe no WhatsApp: ${res.data.numberFormatted}`);
      } else {
        toast.warn("❌ Número não encontrado no WhatsApp");
      }
    } catch (err) { toastError(err); }
  };

  const handleSendNoTicket = async (values) => {
    try {
      await axios.post(getNoTicketEndpoint(), { number: values.number, body: values.body }, {
        headers: { "Content-type": "application/json", Authorization: `Bearer ${values.token}` },
      });
      toast.success("Mensagem enviada (sem ticket)");
    } catch (err) { toastError(err); }
  };

  const handleSendLinkImage = async (values) => {
    try {
      await axios.post(getLinkImageEndpoint(), { number: values.number, url: values.url, caption: values.caption }, {
        headers: { "Content-type": "application/json", Authorization: `Bearer ${values.token}` },
      });
      toast.success("Imagem enviada com sucesso");
    } catch (err) { toastError(err); }
  };

  const handleSendBulk = async (values) => {
    try {
      let messages;
      try {
        messages = JSON.parse(bulkMessages);
      } catch {
        toast.error('JSON inválido. Use o formato: [{"number":"55...","body":"texto"}]');
        return;
      }
      const res = await axios.post(getBulkEndpoint(), { messages, delay: Number(values.delay) || 2000 }, {
        headers: { "Content-type": "application/json", Authorization: `Bearer ${values.token}` },
      });
      toast.success(`Lote enviado: ${res.data.sent}/${res.data.total} mensagens com sucesso`);
    } catch (err) { toastError(err); }
  };

  const handleListConnections = async (values) => {
    try {
      const res = await axios.get(getConnectionsEndpoint(), {
        headers: { Authorization: `Bearer ${values.token}` },
      });
      toast.success(`${res.data.connections.length} conexão(ões) encontrada(s). Veja o console para detalhes.`);
      console.table(res.data.connections);
    } catch (err) { toastError(err); }
  };

  const [buttonsJson, setButtonsJson] = useState('[{"text":"Opção 1","id":"1"},{"text":"Opção 2","id":"2"},{"text":"Opção 3","id":"3"}]');

  const handleSendButtons = async (values) => {
    try {
      let buttons;
      try {
        buttons = JSON.parse(buttonsJson);
      } catch {
        toast.error('JSON de botões inválido. Use: [{"text":"Texto","id":"1"}]');
        return;
      }
      await axios.post(getButtonsEndpoint(), {
        number: values.number,
        body: values.body,
        footer: values.footer || undefined,
        type: "buttons",
        buttons,
      }, {
        headers: { "Content-type": "application/json", Authorization: `Bearer ${values.token}` },
      });
      toast.success("Mensagem com botões enviada com sucesso");
    } catch (err) { toastError(err); }
  };

  const renderSection = (number, title, isNew, docContent, formContent) => (
    <>
      <Divider className={classes.sectionDivider} />
      <Typography variant="h6" color="primary" className={classes.elementMargin}>
        {number}. {title}
        {isNew && <span className={classes.badgeNew}>NOVO</span>}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography className={classes.elementMargin} component="div">
            {docContent}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography className={classes.elementMargin}>
            <b>Teste de envio</b>
          </Typography>
          {formContent}
        </Grid>
      </Grid>
    </>
  );

  const renderSimpleForm = (initialValues, onSubmit, fields, submitLabel = "Enviar") => (
    <Formik initialValues={initialValues} enableReinitialize onSubmit={(values, actions) => {
      setTimeout(async () => { await onSubmit(values); actions.setSubmitting(false); actions.resetForm(); }, 400);
    }}>
      {({ isSubmitting }) => (
        <Form className={classes.formContainer}>
          <Grid container spacing={2}>
            {fields.map((f) => (
              <Grid item xs={12} md={f.md || 12} key={f.name}>
                <Field as={TextField} label={f.label} name={f.name} variant="outlined" margin="dense" fullWidth required={f.required !== false} multiline={f.multiline} rows={f.rows} />
              </Grid>
            ))}
            <Grid item xs={12} className={classes.textRight}>
              <Button type="submit" color="primary" variant="contained">
                {isSubmitting ? <CircularProgress size={24} /> : submitLabel}
              </Button>
            </Grid>
          </Grid>
        </Form>
      )}
    </Formik>
  );

  return (
    <Paper className={classes.mainPaper} style={{ marginLeft: "5px" }} variant="outlined">
      <Typography variant="h5">📡 Documentação para envio de mensagens</Typography>

      <Typography variant="h6" color="primary" className={classes.elementMargin}>
        Métodos de Envio
      </Typography>
      <Typography component="div">
        <ol>
          <li>Mensagens de Texto</li>
          <li>Mensagens de Mídia</li>
          <li>Verificar Número <span className={classes.badgeNew}>NOVO</span></li>
          <li>Envio Sem Ticket <span className={classes.badgeNew}>NOVO</span></li>
          <li>Imagem por URL <span className={classes.badgeNew}>NOVO</span></li>
          <li>Envio em Lote <span className={classes.badgeNew}>NOVO</span></li>
          <li>Listar Conexões <span className={classes.badgeNew}>NOVO</span></li>
          <li>Mensagem com Botões <span className={classes.badgeNew}>NOVO</span></li>
        </ol>
      </Typography>

      <Typography variant="h6" color="primary" className={classes.elementMargin}>Instruções</Typography>
      <Typography className={classes.elementMargin} component="div">
        <b>Observações Importantes</b>
        <ul>
          <li>Antes de enviar mensagens, é necessário o cadastro do token vinculado à conexão que enviará as mensagens. Acesse o menu <b>Conexões</b>, clique em editar e insira o token.</li>
          <li>O número não deve ter máscara ou caracteres especiais e deve ser composto por: Código do País + DDD + Número (ex: 5511999998888)</li>
          <li>Todos os endpoints exigem o header: <code>Authorization: Bearer SEU_TOKEN</code></li>
        </ul>
      </Typography>

      {/* 1. TEXTO */}
      {renderSection(1, "Mensagens de Texto", false,
        <>
          <p>Envio de mensagem de texto com registro de ticket.</p>
          <div className={classes.endpointBox}><b>POST</b> {getEndpoint()}</div>
          <b>Headers:</b> Authorization Bearer (token) e Content-Type (application/json)<br /><br />
          <b>Body JSON:</b>
          <div className={classes.codeBlock}>{`{
  "number": "5585999999999",
  "body": "Mensagem",
  "userId": "ID do usuário ou ''",
  "queueId": "ID da fila ou ''",
  "sendSignature": false,
  "closeTicket": false
}`}</div>
        </>,
        renderSimpleForm({ token: "", number: "", body: "", userId: "", queueId: "" }, handleSendTextMessage, [
          { name: "token", label: "Token cadastrado *", md: 6 },
          { name: "number", label: "Número *", md: 6 },
          { name: "body", label: "Mensagem *" },
          { name: "userId", label: "ID do usuário/atendente", md: 6, required: false },
          { name: "queueId", label: "ID da Fila", md: 6, required: false },
        ], "ENVIAR")
      )}

      {/* 2. MÍDIA */}
      {renderSection(2, "Mensagens de Mídia", false,
        <>
          <p>Envio de arquivos (imagem, áudio, vídeo, documento).</p>
          <div className={classes.endpointBox}><b>POST</b> {getEndpoint()}</div>
          <b>Headers:</b> Authorization Bearer e Content-Type (multipart/form-data)<br /><br />
          <b>FormData:</b>
          <ul>
            <li><b>number:</b> 5585999999999</li>
            <li><b>body:</b> Legenda (opcional)</li>
            <li><b>userId:</b> ID usuário ou ""</li>
            <li><b>queueId:</b> ID da fila ou ""</li>
            <li><b>medias:</b> arquivo</li>
            <li><b>sendSignature:</b> true/false</li>
            <li><b>closeTicket:</b> true/false</li>
          </ul>
        </>,
        <Formik initialValues={{ token: "", number: "", body: "", userId: "", queueId: "" }} enableReinitialize onSubmit={(values, actions) => {
          setTimeout(async () => { await handleSendMediaMessage(values); actions.setSubmitting(false); actions.resetForm(); document.getElementById("medias").value = null; }, 400);
        }}>
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><Field as={TextField} label="Token cadastrado *" name="token" variant="outlined" margin="dense" fullWidth required /></Grid>
                <Grid item xs={12} md={6}><Field as={TextField} label="Número *" name="number" variant="outlined" margin="dense" fullWidth required /></Grid>
                <Grid item xs={12}><Field as={TextField} label="Legenda (opcional)" name="body" variant="outlined" margin="dense" fullWidth /></Grid>
                <Grid item xs={12} md={6}><Field as={TextField} label="ID do usuário/atendente" name="userId" variant="outlined" margin="dense" fullWidth /></Grid>
                <Grid item xs={12} md={6}><Field as={TextField} label="ID da Fila" name="queueId" variant="outlined" margin="dense" fullWidth /></Grid>
                <Grid item xs={12}><input type="file" name="medias" id="medias" required onChange={(e) => setFile(e.target.files)} /></Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" color="primary" variant="contained">{isSubmitting ? <CircularProgress size={24} /> : "Enviar"}</Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      )}

      {/* 3. VERIFICAR NÚMERO */}
      {renderSection(3, "Verificar Número no WhatsApp", true,
        <>
          <p>Verifica se um número possui WhatsApp ativo antes de enviar mensagens.</p>
          <div className={classes.endpointBox}><b>POST</b> {getCheckEndpoint()}</div>
          <b>Body JSON:</b>
          <div className={classes.codeBlock}>{`{
  "number": "5585999999999"
}`}</div>
          <b>Resposta:</b>
          <div className={classes.codeBlock}>{`{
  "existsInWhatsapp": true,
  "number": "5585999999999",
  "numberFormatted": "5585999999999@s.whatsapp.net"
}`}</div>
        </>,
        renderSimpleForm({ token: "", number: "" }, handleCheckNumber, [
          { name: "token", label: "Token cadastrado *", md: 6 },
          { name: "number", label: "Número *", md: 6 },
        ], "Verificar")
      )}

      {/* 4. ENVIO SEM TICKET */}
      {renderSection(4, "Envio Sem Ticket (Disparo Rápido)", true,
        <>
          <p>Envia mensagem de texto diretamente, <b>sem criar ou registrar ticket</b>. Ideal para notificações rápidas.</p>
          <div className={classes.endpointBox}><b>POST</b> {getNoTicketEndpoint()}</div>
          <b>Body JSON:</b>
          <div className={classes.codeBlock}>{`{
  "number": "5585999999999",
  "body": "Sua mensagem aqui"
}`}</div>
          <b>Resposta:</b>
          <div className={classes.codeBlock}>{`{
  "status": "SUCCESS",
  "message": "Mensagem enviada sem registro de ticket."
}`}</div>
        </>,
        renderSimpleForm({ token: "", number: "", body: "" }, handleSendNoTicket, [
          { name: "token", label: "Token cadastrado *", md: 6 },
          { name: "number", label: "Número *", md: 6 },
          { name: "body", label: "Mensagem *", multiline: true, rows: 3 },
        ], "Enviar")
      )}

      {/* 5. IMAGEM POR URL */}
      {renderSection(5, "Envio de Imagem por URL", true,
        <>
          <p>Envia uma imagem a partir de uma URL pública, sem necessidade de upload de arquivo.</p>
          <div className={classes.endpointBox}><b>POST</b> {getLinkImageEndpoint()}</div>
          <b>Body JSON:</b>
          <div className={classes.codeBlock}>{`{
  "number": "5585999999999",
  "url": "https://exemplo.com/imagem.jpg",
  "caption": "Legenda da imagem (opcional)"
}`}</div>
        </>,
        renderSimpleForm({ token: "", number: "", url: "", caption: "" }, handleSendLinkImage, [
          { name: "token", label: "Token cadastrado *", md: 6 },
          { name: "number", label: "Número *", md: 6 },
          { name: "url", label: "URL da imagem *" },
          { name: "caption", label: "Legenda (opcional)", required: false },
        ], "Enviar")
      )}

      {/* 6. ENVIO EM LOTE */}
      {renderSection(6, "Envio em Lote (Bulk)", true,
        <>
          <p>Envia mensagens para múltiplos números em um único request. <b>Limite: 100 mensagens por lote.</b></p>
          <div className={classes.endpointBox}><b>POST</b> {getBulkEndpoint()}</div>
          <b>Body JSON:</b>
          <div className={classes.codeBlock}>{`{
  "delay": 2000,
  "messages": [
    {"number": "5585999999999", "body": "Olá João!"},
    {"number": "5585888888888", "body": "Olá Maria!"}
  ]
}`}</div>
          <b>Resposta:</b>
          <div className={classes.codeBlock}>{`{
  "total": 2,
  "sent": 2,
  "results": [
    {"number": "5585999999999", "status": "SUCCESS"},
    {"number": "5585888888888", "status": "SUCCESS"}
  ]
}`}</div>
          <Box mt={1}>
            <Chip size="small" label="delay: intervalo em ms entre envios (padrão: 2000)" className={classes.chip} />
          </Box>
        </>,
        <Formik initialValues={{ token: "", delay: "2000" }} enableReinitialize onSubmit={(values, actions) => {
          setTimeout(async () => { await handleSendBulk(values); actions.setSubmitting(false); }, 400);
        }}>
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}><Field as={TextField} label="Token cadastrado *" name="token" variant="outlined" margin="dense" fullWidth required /></Grid>
                <Grid item xs={12} md={4}><Field as={TextField} label="Delay (ms)" name="delay" variant="outlined" margin="dense" fullWidth /></Grid>
                <Grid item xs={12}>
                  <TextField
                    label='JSON das mensagens *'
                    multiline
                    rows={6}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    value={bulkMessages}
                    onChange={(e) => setBulkMessages(e.target.value)}
                    placeholder={`[{"number":"5585999999999","body":"Olá!"}]`}
                    required
                  />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" color="primary" variant="contained">{isSubmitting ? <CircularProgress size={24} /> : "Enviar Lote"}</Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      )}

      {/* 7. LISTAR CONEXÕES */}
      {renderSection(7, "Listar Conexões Disponíveis", true,
        <>
          <p>Retorna todas as conexões WhatsApp ativas da empresa. Útil para obter IDs das conexões.</p>
          <div className={classes.endpointBox}><b>GET</b> {getConnectionsEndpoint()}</div>
          <b>Resposta:</b>
          <div className={classes.codeBlock}>{`{
  "connections": [
    {
      "id": 1,
      "name": "Suporte",
      "status": "CONNECTED",
      "isDefault": true,
      "number": "5585999999999",
      "channel": "whatsapp"
    }
  ]
}`}</div>
        </>,
        renderSimpleForm({ token: "" }, handleListConnections, [
          { name: "token", label: "Token cadastrado *" },
        ], "Listar Conexões")
      )}

      {/* 8. MENSAGEM COM BOTÕES */}
      {renderSection(8, "Mensagem com Botões Interativos", true,
        <>
          <p>Envia mensagem interativa com até <b>3 botões</b> clicáveis. Suporta também listas, URLs e PIX.</p>
          <div className={classes.endpointBox}><b>POST</b> {getButtonsEndpoint()}</div>
          <b>Headers:</b> Authorization Bearer (token) e Content-Type (application/json)<br /><br />
          <b>Body JSON (Botões):</b>
          <div className={classes.codeBlock}>{`{
  "number": "5585999999999",
  "body": "Escolha uma opção:",
  "footer": "Rodapé opcional",
  "type": "buttons",
  "buttons": [
    {"text": "Opção 1", "id": "1"},
    {"text": "Opção 2", "id": "2"},
    {"text": "Opção 3", "id": "3"}
  ]
}`}</div>
          <b>Body JSON (Lista):</b>
          <div className={classes.codeBlock}>{`{
  "number": "5585999999999",
  "body": "Selecione um serviço:",
  "type": "list",
  "buttonText": "Ver opções",
  "sections": [
    {
      "title": "Serviços",
      "rows": [
        {"title": "Suporte", "id": "suporte", "description": "Falar com suporte"},
        {"title": "Vendas", "id": "vendas", "description": "Falar com vendas"}
      ]
    }
  ]
}`}</div>
          <Box mt={1}>
            <Chip size="small" label="type: buttons | list | url | copy | pix" className={classes.chip} />
            <Chip size="small" label="Máx. 3 botões" className={classes.chip} />
          </Box>
        </>,
        <Formik initialValues={{ token: "", number: "", body: "", footer: "" }} enableReinitialize onSubmit={(values, actions) => {
          setTimeout(async () => { await handleSendButtons(values); actions.setSubmitting(false); actions.resetForm(); }, 400);
        }}>
          {({ isSubmitting }) => (
            <Form className={classes.formContainer}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><Field as={TextField} label="Token cadastrado *" name="token" variant="outlined" margin="dense" fullWidth required /></Grid>
                <Grid item xs={12} md={6}><Field as={TextField} label="Número *" name="number" variant="outlined" margin="dense" fullWidth required /></Grid>
                <Grid item xs={12}><Field as={TextField} label="Mensagem (body) *" name="body" variant="outlined" margin="dense" fullWidth required multiline rows={2} /></Grid>
                <Grid item xs={12}><Field as={TextField} label="Rodapé (footer)" name="footer" variant="outlined" margin="dense" fullWidth /></Grid>
                <Grid item xs={12}>
                  <TextField
                    label='JSON dos botões *'
                    multiline
                    rows={4}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    value={buttonsJson}
                    onChange={(e) => setButtonsJson(e.target.value)}
                    placeholder={`[{"text":"Opção 1","id":"1"},{"text":"Opção 2","id":"2"}]`}
                    required
                  />
                </Grid>
                <Grid item xs={12} className={classes.textRight}>
                  <Button type="submit" color="primary" variant="contained">{isSubmitting ? <CircularProgress size={24} /> : "Enviar Botões"}</Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      )}
    </Paper>
  );
};

export default MessagesAPI;
