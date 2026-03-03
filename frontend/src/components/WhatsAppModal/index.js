import React, { useState, useEffect, useRef, useContext } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { isNil } from "lodash";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import moment from "moment";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  DialogActions,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Tab,
  Tabs,
  Paper,
  Box,
} from "@material-ui/core";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import TabPanel from "../TabPanel";
import { Autorenew, FileCopy } from "@material-ui/icons";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import SchedulesForm from "../SchedulesForm";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Colorize } from "@material-ui/icons";
import ColorPicker from "../ColorPicker";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import getRandomHexColor from "../../utils/getRandomHexColor";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },

  multFieldLine: {
    marginTop: 16,
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },

  btnWrapper: {
    position: "relative",
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 600,
    padding: "8px 28px",
    fontSize: "0.9rem",
  },

  importMessage: {
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    display: "flex",
    flexDirection: "column",
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },

  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
    '& .MuiOutlinedInput-root': {
      borderRadius: 10,
    },
  },
  tokenRefresh: {
    minWidth: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  colorAdorment: {
    width: 20,
    height: 20,
    borderRadius: 6,
    border: `1px solid ${theme.palette.divider}`,
  },
  formControl: {
    width: 220,
  },
  colorField: {
    width: 150,
    '& .MuiOutlinedInput-root': {
      borderRadius: 10,
    },
  },
  dialogPaper: {
    borderRadius: 16,
    maxHeight: "calc(100dvh - 24px)",
    overflowY: "auto",
    [theme.breakpoints.down("sm")]: {
      maxHeight: "calc(100dvh - 12px)",
      margin: 6,
    },
  },
  dialogTitle: {
    padding: "20px 24px 12px",
    '& h2': {
      fontSize: "1.3rem",
      fontWeight: 700,
      color: theme.palette.text.primary,
    },
  },
  tabsContainer: {
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : '#f5f7fa',
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  modernTab: {
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.85rem",
    minWidth: "auto",
    padding: "10px 18px",
    borderRadius: "10px 10px 0 0",
    transition: "all 0.2s ease",
    color: theme.palette.text.secondary,
    '&.Mui-selected': {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.background.paper,
    },
  },
  sectionCard: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff',
    transition: "box-shadow 0.2s ease",
    '&:hover': {
      boxShadow: theme.palette.type === 'dark' 
        ? '0 2px 12px rgba(0,0,0,0.3)' 
        : '0 2px 12px rgba(0,0,0,0.06)',
    },
  },
  sectionTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: theme.palette.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: "0.8rem",
    color: theme.palette.text.secondary,
    marginBottom: 12,
    lineHeight: 1.4,
  },
  dialogContentModern: {
    padding: "16px 24px !important",
  },
  dialogActionsModern: {
    padding: "12px 24px 20px",
    borderTop: `1px solid ${theme.palette.divider}`,
    gap: 8,
  },
  cancelButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 600,
    padding: "8px 24px",
    borderColor: theme.palette.divider,
    color: theme.palette.text.secondary,
    '&:hover': {
      borderColor: theme.palette.error.main,
      color: theme.palette.error.main,
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(244,67,54,0.08)' : 'rgba(244,67,54,0.04)',
    },
  },
  modernInput: {
    '& .MuiOutlinedInput-root': {
      borderRadius: 10,
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      '&:hover': {
        borderColor: theme.palette.primary.main,
      },
      '&.Mui-focused': {
        boxShadow: `0 0 0 3px ${theme.palette.primary.main}20`,
      },
    },
  },
  uploadButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 600,
    padding: "10px 0",
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
    color: "#fff",
    '&:hover': {
      background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
    },
  },
  tokenField: {
    '& .MuiOutlinedInput-root': {
      borderRadius: 10,
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8f9fb',
    },
  },
}));

const SessionSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
});

const WhatsAppModal = ({ open, onClose, whatsAppId, channel }) => {
  const classes = useStyles();
  const [autoToken, setAutoToken] = useState("");

  const inputFileRef = useRef(null);

  const [attachment, setAttachment] = useState(null);
  const [attachmentName, setAttachmentName] = useState("");

  const initialState = {
    name: "",
    greetingMessage: "",
    complationMessage: "",
    outOfHoursMessage: "",
    ratingMessage: "",
    isDefault: false,
    token: "",
    maxUseBotQueues: 3,
    provider: "beta",
    expiresTicket: 0,
    allowGroup: false,
    enableImportMessage: false,
    groupAsTicket: "disabled",
    timeUseBotQueues: "0",
    timeSendQueue: "0",
    sendIdQueue: 0,
    expiresTicketNPS: "0",
    expiresInactiveMessage: "",
    timeInactiveMessage: "",
    inactiveMessage: "",
    maxUseBotQueuesNPS: 3,
    whenExpiresTicket: 0,
    timeCreateNewTicket: 0,
    greetingMediaAttachment: "",
    integrationId: "",
    isOficial: false,
    phone_number_id: "",
    waba_id: "",
    send_token: "",
    business_id: "",
    phone_number: "",
    color: getRandomHexColor(),
    flowInactiveTime: 0,
    flowIdInactiveTime: 0,
    timeAwaitActiveFlowId: 0,
    maxUseInactiveTime: 1,
    timeToReturnQueue: 0,
    triggerIntegrationOnClose: true,
    wavoip: "",
  };
  const [whatsApp, setWhatsApp] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [queues, setQueues] = useState([]);
  const [tab, setTab] = useState("general");
  const [copied, setCopied] = useState(false);
  const [integrations, setIntegrations] = useState([]);
  const [schedulesEnabled, setSchedulesEnabled] = useState(false);
  const [NPSEnabled, setNPSEnabled] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const { user } = useContext(AuthContext);
  const [isOficial, setIsOficial] = useState(false);
  const [useWhatsappOfficial, setUseWhatsappOfficial] = useState(false);
  const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);

  const [schedules, setSchedules] = useState([
    {
      weekday: i18n.t("queueModal.serviceHours.monday"),
      weekdayEn: "monday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.tuesday"),
      weekdayEn: "tuesday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.wednesday"),
      weekdayEn: "wednesday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.thursday"),
      weekdayEn: "thursday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.friday"),
      weekdayEn: "friday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: "Sábado",
      weekdayEn: "saturday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: "Domingo",
      weekdayEn: "sunday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
  ]);

  const { get: getSetting } = useCompanySettings();
  const { getPlanCompany } = usePlans();

  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [triggerIntegrationOnClose, setTriggerIntegrationOnClose] =
    useState(true);
  const [integrationType, setIntegrationType] = useState("n8n");
  const [integrationTypeId, setIntegrationTypeId] = useState(null);

  const [prompts, setPrompts] = useState([]);

  const [webhooks, setWebhooks] = useState([]);
  const [flowIdNotPhrase, setFlowIdNotPhrase] = useState();
  const [flowIdWelcome, setFlowIdWelcome] = useState();
  const [flowIdInactiveTime, setFlowIdInactiveTime] = useState();
  const [timeAwaitActiveFlowId, setTimeAwaitActiveFlowId] = useState();
  const [showWavoipCall, setShowWavoipCall] = useState(false);

  useEffect(() => {
    if (!whatsAppId && !whatsApp.token) {
      setAutoToken(generateRandomCode(30));
    } else if (whatsAppId && !whatsApp.token) {
      setAutoToken(generateRandomCode(30));
    } else {
      setAutoToken(whatsApp.token);
    }
  }, [whatsAppId, whatsApp.token]);

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);

      setShowOpenAi(planConfigs.plan.useOpenAi);
      setShowIntegrations(planConfigs.plan.useIntegrations);
      setUseWhatsappOfficial(planConfigs.plan.useWhatsappOfficial);
      setShowWavoipCall(planConfigs.plan.wavoip);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/prompt");
        setPrompts(data.prompts);
      } catch (err) {
        toastError(err);
      }
    })();
  }, [whatsAppId]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/flowbuilder");
        setWebhooks(data.flows);
      } catch (err) {
        toastError(err);
      }
    })();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const settingSchedules = await getSetting({
        column: "scheduleType",
      });
      setSchedulesEnabled(settingSchedules.scheduleType === "connection");
      const settingNPS = await getSetting({
        column: "userRating",
      });
      setNPSEnabled(settingNPS.userRating === "enabled");
    };
    fetchData();
  }, []);


  const handleEnableIsOficial = async (e) => {
    setIsOficial(e.target.checked);
  };

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        const { data } = await api.get(`whatsapp/${whatsAppId}?session=0`);

        if (data && data?.flowIdNotPhrase) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.flowIdNotPhrase}`
          );
          const selectedFlowIdNotPhrase = flowDefault?.flow.id;
          setFlowIdNotPhrase(selectedFlowIdNotPhrase);
        }

        if (data && data?.flowIdWelcome) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.flowIdWelcome}`
          );
          const selectedFlowIdWelcome = flowDefault?.flow.id;
          setFlowIdWelcome(selectedFlowIdWelcome);
        }

        if (data && data?.flowIdInactiveTime) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.flowIdInactiveTime}`
          );
          const selectedFlowIdInactiveTime = flowDefault?.flow.id;
          setFlowIdInactiveTime(selectedFlowIdInactiveTime);
        }

        if (data && data?.timeAwaitActiveFlowId) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.timeAwaitActiveFlowId}`
          );
          const selectedTimeAwaitActiveFlowId = flowDefault?.flow.id;
          setTimeAwaitActiveFlowId(selectedTimeAwaitActiveFlowId);
        }

        setWhatsApp(data);
        setAttachmentName(data.greetingMediaAttachment);
        setAutoToken(data.token);
        data.promptId
          ? setSelectedPrompt(data.promptId)
          : setSelectedPrompt(null);
        const whatsQueueIds = data.queues?.map((queue) => queue.id);
        setSelectedQueueIds(whatsQueueIds);
        setIsOficial(channel === "whatsapp_oficial");
        setSchedules(data.schedules);
      } catch (err) {
        toastError(err);
      }
    };
    fetchSession();
  }, [whatsAppId]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/queue");
        setQueues(data);
      } catch (err) {
        toastError(err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/queueIntegration");

        setIntegrations(data.queueIntegrations);
      } catch (err) {
        toastError(err);
      }
    })();
  }, []);

  const handleChangeQueue = (e) => {
    setSelectedQueueIds(e);
    setSelectedPrompt(null);
  };

  const handleChangePrompt = (e) => {
    setSelectedPrompt(e.target.value);
    setSelectedQueueIds([]);
  };

  const handleChange = (e) => {
    setTriggerIntegrationOnClose(e.target.value);
  };

  const handleIntegrationTypeChange = (e) => {
    setIntegrationType(e.target.value);
    setIntegrationTypeId(e.target.value);
  };

  const handleSaveWhatsApp = async (values) => {
    if (!whatsAppId) setAutoToken(generateRandomCode(30));

    if (NPSEnabled) {
      if (isNil(values.ratingMessage)) {
        toastError(i18n.t("whatsappModal.errorRatingMessage"));
        return;
      }

      if (
        values.expiresTicketNPS === "0" &&
        values.expiresTicketNPS === "" &&
        values.expiresTicketNPS === 0
      ) {
        toastError(i18n.t("whatsappModal.errorExpiresNPS"));
        return;
      }
    }

    if (values.timeSendQueue === "") values.timeSendQueue = "0";

    if (
      (values.sendIdQueue === 0 ||
        values.sendIdQueue === "" ||
        isNil(values.sendIdQueue)) &&
      values.timeSendQueue !== 0 &&
      values.timeSendQueue !== "0"
    ) {
      toastError(i18n.t("whatsappModal.errorSendQueue"));
      return;
    }

    const whatsappData = {
      ...values,
      flowIdWelcome: flowIdWelcome ? flowIdWelcome : null,
      flowIdInactiveTime: flowIdInactiveTime ? flowIdInactiveTime : null,
      flowIdNotPhrase: flowIdNotPhrase ? flowIdNotPhrase : null,
      timeAwaitActiveFlowId: timeAwaitActiveFlowId
        ? timeAwaitActiveFlowId
        : null,
      queueIds: selectedQueueIds,
      token: autoToken ? autoToken : null,
      schedules,
      promptId: selectedPrompt ? selectedPrompt : null,
      channel,
      triggerIntegrationOnClose: triggerIntegrationOnClose,
      integrationTypeId: triggerIntegrationOnClose ? integrationTypeId : null,
      color: values.color ? values.color : getRandomHexColor(),
      wavoip: values.wavoip ? values.wavoip : null,
    };
    delete whatsappData["queues"];
    delete whatsappData["session"];

    try {
      if (whatsAppId) {
        await api.put(`/whatsapp/${whatsAppId}`, whatsappData);
        if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/whatsapp/${whatsAppId}/media-upload`, formData);
        }
        if (!attachmentName && whatsApp.greetingMediaAttachment !== null) {
          await api.delete(`/whatsapp/${whatsAppId}/media-upload`);
        }
      } else {
        const { data } = await api.post("/whatsapp", whatsappData);
        if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/whatsapp/${data.id}/media-upload`, formData);
        }
      }
      toast.success(i18n.t("whatsappModal.success"));

      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  function generateRandomCode(length) {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyvz0123456789";
    let code = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      code += charset.charAt(randomIndex);
    }
    return code;
  }

  const handleRefreshToken = () => {
    setAutoToken(generateRandomCode(30));
  };

  const handleChangeFlowIdNotPhrase = (e) => {
    console.log(e.target.value);
    setFlowIdNotPhrase(e.target.value);
  };

  const handleChangeFlowIdWelcome = (e) => {
    setFlowIdWelcome(e.target.value);
  };

  const handleChangeFlowIdInactiveTime = (e) => {
    setFlowIdInactiveTime(e.target.value);
  };

  const handleChangeTimeAwaitActiveFlowId = (e) => {
    setTimeAwaitActiveFlowId(e.target.value);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(autoToken); // Copia o token para a área de transferência
    setCopied(true); // Define o estado de cópia como verdadeiro
  };

  const handleSaveSchedules = async (values) => {
    toast.success("Clique em salvar para registar as alterações");
    setSchedules(values);
  };

  const handleClose = () => {
    onClose();
    setWhatsApp(initialState);
    
    // inputFileRef.current.value = null
    setAttachment(null);
    setAttachmentName("");
    setCopied(false);
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleFileUpload = () => {
    const file = inputFileRef.current.files[0];
    setAttachment(file);
    setAttachmentName(file.name);
    inputFileRef.current.value = null;
  };

  const handleDeleFile = () => {
    setAttachment(null);
    setAttachmentName(null);
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        scroll="paper"
        classes={{ paper: classes.dialogPaper }}
      >
        <DialogTitle className={classes.dialogTitle}>
          {whatsAppId
            ? i18n.t("whatsappModal.title.edit")
            : i18n.t("whatsappModal.title.add")}
        </DialogTitle>
        <Formik
          initialValues={whatsApp}
          enableReinitialize={true}
          validationSchema={SessionSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveWhatsApp(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ values, touched, errors, isSubmitting }) => (
            <Form>
              <Paper elevation={0} className={classes.tabsContainer}>
                <Tabs
                  value={tab}
                  indicatorColor="primary"
                  textColor="primary"
                  scrollButtons="on"
                  variant="scrollable"
                  onChange={handleTabChange}
                >
                  <Tab
                    label={i18n.t("whatsappModal.tabs.general")}
                    value={"general"}
                    className={classes.modernTab}
                  />
                  <Tab
                    label={i18n.t("whatsappModal.tabs.integrations")}
                    value={"integrations"}
                    className={classes.modernTab}
                  />
                  <Tab
                    label={i18n.t("whatsappModal.tabs.messages")}
                    value={"messages"}
                    className={classes.modernTab}
                  />
                  <Tab label="Chatbot" value={"chatbot"} className={classes.modernTab} />
                  <Tab
                    label={i18n.t("whatsappModal.tabs.assessments")}
                    value={"nps"}
                    className={classes.modernTab}
                  />
                  {user.showFlow === "enabled" && (
                    <Tab label="Fluxo Padrão" value={"flowbuilder"} className={classes.modernTab} />
                  )}
                  {schedulesEnabled && (
                    <Tab
                      label={i18n.t("whatsappModal.tabs.schedules")}
                      value={"schedules"}
                      className={classes.modernTab}
                    />
                  )}
                </Tabs>
              </Paper>
              <Paper elevation={0} style={{ borderRadius: 0 }}>
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"general"}
                >
                  <DialogContent className={classes.dialogContentModern}>
                    {attachmentName && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row-reverse",
                        }}
                      >
                        <Button
                          variant="outlined"
                          color="primary"
                          endIcon={<DeleteOutlineIcon />}
                          onClick={handleDeleFile}
                        >
                          {attachmentName}
                        </Button>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column-reverse",
                      }}
                    >
                      <input
                        type="file"
                        accept="video/*,image/*"
                        ref={inputFileRef}
                        style={{ display: "none" }}
                        onChange={handleFileUpload}
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        className={classes.uploadButton}
                        onClick={() => inputFileRef.current.click()}
                      >
                        {i18n.t("userModal.buttons.addImage")}
                      </Button>
                    </div>
                    {/* NOME E PADRAO */}
                    <div className={classes.multFieldLine}>
                      <Grid spacing={2} container>
                        <Grid item>
                          <Field
                            as={TextField}
                            label={i18n.t("whatsappModal.form.name")}
                            autoFocus
                            name="name"
                            error={touched.name && Boolean(errors.name)}
                            helperText={touched.name && errors.name}
                            variant="outlined"
                            margin="dense"
                            className={classes.textField}
                          />
                        </Grid>

                        {/* COR */}
                        <Grid item>
                          <Field
                            as={TextField}
                            label={i18n.t("connections.table.color")}
                            name="color"
                            id="color"
                            onFocus={() => {
                              setColorPickerModalOpen(false);
                            }}
                            error={touched.color && Boolean(errors.color)}
                            helperText={touched.color && errors.color}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <div
                                    style={{ backgroundColor: values.color }}
                                    className={classes.colorAdorment}
                                  ></div>
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <IconButton
                                  size="small"
                                  color="default"
                                  onClick={() => setColorPickerModalOpen(true)}
                                >
                                  <Colorize />
                                </IconButton>
                              ),
                            }}
                            variant="outlined"
                            margin="dense"
                            className={classes.colorField}
                          />
                          <ColorPicker
                            open={colorPickerModalOpen}
                            handleClose={() => setColorPickerModalOpen(false)}
                            onChange={(color) => {
                              values.color = color;
                              setWhatsApp(() => {
                                return { ...values, color };
                              });
                            }}
                          />
                        </Grid>

                        <Grid style={{ paddingTop: 15 }} item>
                          <FormControlLabel
                            control={
                              <Field
                                as={Switch}
                                color="primary"
                                name="isDefault"
                                checked={values.isDefault}
                              />
                            }
                            label={i18n.t("whatsappModal.form.default")}
                          />
                          {useWhatsappOfficial &&
                            channel === "whatsapp_oficial" && (
                              <FormControlLabel
                                style={{ marginRight: 7, color: "gray" }}
                                label={i18n.t("whatsappModal.form.isOficial")}
                                labelPlacement="end"
                                control={
                                  <Switch
                                    size="medium"
                                    checked={isOficial}
                                    onChange={handleEnableIsOficial}
                                    name="isOficial"
                                    color="primary"
                                  />
                                }
                              />
                            )}
                          <FormControlLabel
                            control={
                              <Field
                                as={Switch}
                                color="primary"
                                name="allowGroup"
                                checked={values.allowGroup}
                              />
                            }
                            label={i18n.t("whatsappModal.form.group")}
                          />
                        </Grid>
                        <Grid xs={6} md={4} item>
                          <FormControl
                            variant="outlined"
                            margin="dense"
                            fullWidth
                            className={classes.formControl}
                          >
                            <InputLabel id="groupAsTicket-selection-label">
                              {i18n.t("whatsappModal.form.groupAsTicket")}
                            </InputLabel>
                            <Field
                              as={Select}
                              label={i18n.t("whatsappModal.form.groupAsTicket")}
                              placeholder={i18n.t(
                                "whatsappModal.form.groupAsTicket"
                              )}
                              labelId="groupAsTicket-selection-label"
                              id="groupAsTicket"
                              name="groupAsTicket"
                            >
                              <MenuItem value={"disabled"}>
                                {i18n.t("whatsappModal.menuItem.disabled")}
                              </MenuItem>
                              <MenuItem value={"enabled"}>
                                {i18n.t("whatsappModal.menuItem.enabled")}
                              </MenuItem>
                            </Field>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </div>

                    {isOficial && (
                      <div className={classes.importMessage}>
                        <Grid style={{ marginTop: 18 }} container spacing={1}>
                          <Grid xs={12} md={6} xl={3} item>
                            <Field
                              fullWidth
                              as={TextField}
                              label={i18n.t(
                                "whatsappModal.form.phone_number_id"
                              )}
                              name="phone_number_id"
                              InputLabelProps={{
                                shrink: true,
                              }}
                              error={
                                touched.phone_number_id &&
                                Boolean(errors.phone_number_id)
                              }
                              helperText={
                                touched.phone_number_id &&
                                errors.phone_number_id
                              }
                              variant="outlined"
                              required={isOficial}
                            />
                          </Grid>
                          <Grid xs={12} md={6} xl={3} item>
                            <Field
                              fullWidth
                              as={TextField}
                              label={i18n.t("whatsappModal.form.waba_id")}
                              name="waba_id"
                              InputLabelProps={{
                                shrink: true,
                              }}
                              error={touched.waba_id && Boolean(errors.waba_id)}
                              helperText={touched.waba_id && errors.waba_id}
                              variant="outlined"
                              required={isOficial}
                            />
                          </Grid>

                          <Grid xs={12} md={6} xl={3} item>
                            <Field
                              fullWidth
                              as={TextField}
                              label={i18n.t("whatsappModal.form.business_id")}
                              name="business_id"
                              InputLabelProps={{
                                shrink: true,
                              }}
                              error={
                                touched.business_id &&
                                Boolean(errors.business_id)
                              }
                              helperText={
                                touched.business_id && errors.business_id
                              }
                              variant="outlined"
                              required={isOficial}
                            />
                          </Grid>
                          <Grid xs={12} md={6} xl={3} item>
                            <Field
                              fullWidth
                              as={TextField}
                              label={i18n.t("whatsappModal.form.phone_number")}
                              name="phone_number"
                              InputLabelProps={{
                                shrink: true,
                              }}
                              error={
                                touched.phone_number &&
                                Boolean(errors.phone_number)
                              }
                              helperText={
                                touched.phone_number && errors.phone_number
                              }
                              variant="outlined"
                              required={isOficial}
                            />
                          </Grid>
                          <Grid xs={12} md={12} xl={12} item>
                            <Field
                              fullWidth
                              as={TextField}
                              label={i18n.t("whatsappModal.form.send_token")}
                              name="send_token"
                              InputLabelProps={{
                                shrink: true,
                              }}
                              error={
                                touched.send_token && Boolean(errors.send_token)
                              }
                              helperText={
                                touched.send_token && errors.send_token
                              }
                              variant="outlined"
                              required={isOficial}
                            />
                          </Grid>
                        </Grid>
                      </div>
                    )}

                    {/* TOKEN */}
                    <div className={classes.sectionCard}>
                      <div className={classes.sectionTitle}>Token para integração externa</div>
                      <Box display="flex" alignItems="center" mt={1}>
                        <Grid xs={6} md={12} item>
                          <Field
                            as={TextField}
                            label={i18n.t("whatsappModal.form.token")}
                            type="token"
                            fullWidth
                            value={autoToken}
                            variant="outlined"
                            margin="dense"
                            disabled
                            className={classes.tokenField}
                          />
                        </Grid>
                        <Button
                          onClick={handleRefreshToken}
                          disabled={isSubmitting}
                          className={classes.tokenRefresh}
                          variant="text"
                          startIcon={
                            <Autorenew
                              style={{ marginLeft: 5, color: "green" }}
                            />
                          }
                        />
                        <Button
                          onClick={handleCopyToken}
                          className={classes.tokenRefresh}
                          variant="text"
                          startIcon={
                            <FileCopy
                              style={{ color: copied ? "blue" : "inherit" }}
                            />
                          }
                        />
                      </Box>
                    </div>

                    <div className={classes.sectionCard}>
                      <div className={classes.sectionTitle}>{i18n.t("whatsappModal.form.queueRedirection")}</div>
                      <div className={classes.sectionSubtitle}>{i18n.t("whatsappModal.form.queueRedirectionDesc")}</div>
                      <Grid spacing={2} container>
                        <Grid xs={6} md={6} item>
                          <FormControl
                            variant="outlined"
                            margin="dense"
                            className={classes.FormControl}
                            fullWidth
                          >
                            <InputLabel id="sendIdQueue-selection-label">
                              {i18n.t("whatsappModal.form.sendIdQueue")}
                            </InputLabel>
                            <Field
                              as={Select}
                              name="sendIdQueue"
                              id="sendIdQueue"
                              value={values.sendIdQueue || "0"}
                              required={values.timeSendQueue > 0}
                              label={i18n.t("whatsappModal.form.sendIdQueue")}
                              placeholder={i18n.t(
                                "whatsappModal.form.sendIdQueue"
                              )}
                              labelId="sendIdQueue-selection-label"
                            >
                              <MenuItem value={0}>&nbsp;</MenuItem>
                              {queues.map((queue) => (
                                <MenuItem key={queue.id} value={queue.id}>
                                  {queue.name}
                                </MenuItem>
                              ))}
                            </Field>
                          </FormControl>
                        </Grid>

                        <Grid xs={6} md={6} item>
                          <Field
                            as={TextField}
                            label={i18n.t("whatsappModal.form.timeSendQueue")}
                            fullWidth
                            name="timeSendQueue"
                            variant="outlined"
                            margin="dense"
                            error={
                              touched.timeSendQueue &&
                              Boolean(errors.timeSendQueue)
                            }
                            helperText={
                              touched.timeSendQueue && errors.timeSendQueue
                            }
                          />
                        </Grid>
                      </Grid>
                    </div>
                  </DialogContent>
                </TabPanel>
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"integrations"}
                >
                  <DialogContent className={classes.dialogContentModern}>
                    <QueueSelect
                      selectedQueueIds={selectedQueueIds}
                      onChange={(selectedIds) => handleChangeQueue(selectedIds)}
                    />
                    {showWavoipCall && (
                      <div>
                        <Field
                          as={TextField}
                          label="Wavoip"
                          fullWidth
                          name="wavoip"
                          variant="outlined"
                          margin="dense"
                        />
                      </div>
                    )}
                    {showIntegrations && (
                      <FormControl
                        variant="outlined"
                        margin="dense"
                        className={classes.FormControl}
                        fullWidth
                      >
                        <InputLabel id="integrationId-selection-label">
                          {i18n.t("queueModal.form.integrationId")}
                        </InputLabel>
                        <Field
                          as={Select}
                          label={i18n.t("queueModal.form.integrationId")}
                          name="integrationId"
                          id="integrationId"
                          variant="outlined"
                          margin="dense"
                          placeholder={i18n.t("queueModal.form.integrationId")}
                          labelId="integrationId-selection-label"
                        >
                          <MenuItem value={null}>{"Desabilitado"}</MenuItem>
                          {integrations.map((integration) => (
                            <MenuItem
                              key={integration.id}
                              value={integration.id}
                            >
                              {integration.name}
                            </MenuItem>
                          ))}
                        </Field>
                      </FormControl>
                    )}
                    {showOpenAi && (
                      <FormControl margin="dense" variant="outlined" fullWidth>
                        <InputLabel>
                          {i18n.t("whatsappModal.form.prompt")}
                        </InputLabel>
                        <Select
                          labelId="dialog-select-prompt-label"
                          id="dialog-select-prompt"
                          name="promptId"
                          value={selectedPrompt || ""}
                          onChange={handleChangePrompt}
                          label={i18n.t("whatsappModal.form.prompt")}
                          fullWidth
                          MenuProps={{
                            anchorOrigin: {
                              vertical: "bottom",
                              horizontal: "left",
                            },
                            transformOrigin: {
                              vertical: "top",
                              horizontal: "left",
                            },
                            getContentAnchorEl: null,
                          }}
                        >
                          {prompts.map((prompt) => (
                            <MenuItem key={prompt.id} value={prompt.id}>
                              {prompt.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    <Grid spacing={3} container>
                      <Grid xs={12} item>
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          className={classes.FormControl}
                          fullWidth
                        >
                          <InputLabel id="triggerIntegrationOnClose-selection-label">
                            {i18n.t(
                              "whatsappModal.form.triggerIntegrationOnClose"
                            )}
                          </InputLabel>

                          <Field
                            onChange={handleChange}
                            value={triggerIntegrationOnClose}
                            as={Select}
                            label={i18n.t(
                              "whatsappModal.form.triggerIntegrationOnClose"
                            )}
                            name="triggerIntegrationOnClose"
                            id="triggerIntegrationOnClose"
                            variant="outlined"
                            margin="dense"
                            placeholder={i18n.t(
                              "whatsappModal.form.triggerIntegrationOnClose"
                            )}
                            labelId="triggerIntegrationOnClose-selection-label"
                          >
                            <MenuItem value={false}>
                              {i18n.t("whatsappModal.menuItem.disabled")}
                            </MenuItem>
                            <MenuItem value={true}>
                              {i18n.t("whatsappModal.menuItem.enabled")}
                            </MenuItem>
                          </Field>
                        </FormControl>
                      </Grid>

                      {triggerIntegrationOnClose && (
                        <Grid xs={12} item>
                          <FormControl
                            variant="outlined"
                            margin="dense"
                            className={classes.FormControl}
                            fullWidth
                          >
                            <InputLabel id="integrationType-selection-label">
                              {i18n.t("queueModal.form.integrationId")}
                            </InputLabel>
                            <Field
                              as={Select}
                              label={i18n.t("queueModal.form.integrationId")}
                              name="integrationType"
                              id="integrationType"
                              variant="outlined"
                              margin="dense"
                              placeholder={i18n.t(
                                "queueModal.form.integrationId"
                              )}
                              labelId="integrationType-selection-label"
                              value={integrationTypeId}
                              onChange={handleIntegrationTypeChange}
                            >
                              <MenuItem value={null}>{"Desabilitado"}</MenuItem>
                              {integrations
                                .filter(
                                  (integration) =>
                                    integration.type === "n8n" ||
                                    integration.type === "typebot"
                                )
                                .map((integration) => (
                                  <MenuItem
                                    key={integration.id}
                                    value={integration.id}
                                  >
                                    {integration.name}
                                  </MenuItem>
                                ))}
                            </Field>
                          </FormControl>
                        </Grid>
                      )}
                    </Grid>
                  </DialogContent>
                </TabPanel>
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"messages"}
                >
                  <DialogContent className={classes.dialogContentModern}>
                    {/* MENSAGEM DE SAUDAÇÃO */}
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={12} xl={12}>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.greetingMessage")}
                          type="greetingMessage"
                          multiline
                          rows={4}
                          fullWidth
                          name="greetingMessage"
                          error={
                            touched.greetingMessage &&
                            Boolean(errors.greetingMessage)
                          }
                          helperText={
                            touched.greetingMessage && errors.greetingMessage
                          }
                          variant="outlined"
                          margin="dense"
                        />
                      </Grid>

                      {/* MENSAGEM DE CONCLUSÃO */}
                      <Grid item xs={12} md={12} xl={12}>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.complationMessage")}
                          multiline
                          rows={4}
                          fullWidth
                          name="complationMessage"
                          error={
                            touched.complationMessage &&
                            Boolean(errors.complationMessage)
                          }
                          helperText={
                            touched.complationMessage &&
                            errors.complationMessage
                          }
                          variant="outlined"
                          margin="dense"
                        />
                      </Grid>

                      {/* MENSAGEM DE FORA DE EXPEDIENTE */}
                      <Grid item xs={12} md={12} xl={12}>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.outOfHoursMessage")}
                          multiline
                          rows={4}
                          fullWidth
                          name="outOfHoursMessage"
                          error={
                            touched.outOfHoursMessage &&
                            Boolean(errors.outOfHoursMessage)
                          }
                          helperText={
                            touched.outOfHoursMessage &&
                            errors.outOfHoursMessage
                          }
                          variant="outlined"
                          margin="dense"
                        />
                      </Grid>
                      {/* MENSAGEM DE FÉRIAS COLETIVAS */}
                      <Grid item xs={12} md={12} xl={12}>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "whatsappModal.form.collectiveVacationMessage"
                          )}
                          multiline
                          rows={4}
                          fullWidth
                          name="collectiveVacationMessage"
                          error={
                            touched.collectiveVacationMessage &&
                            Boolean(errors.collectiveVacationMessage)
                          }
                          helperText={
                            touched.collectiveVacationMessage &&
                            errors.collectiveVacationMessage
                          }
                          variant="outlined"
                          margin="dense"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Field
                          fullWidth
                          as={TextField}
                          label={i18n.t(
                            "whatsappModal.form.collectiveVacationStart"
                          )}
                          type="date"
                          name="collectiveVacationStart"
                          required={
                            values.collectiveVacationMessage?.length > 0
                          }
                          inputProps={{
                            min: moment().add(-10, "days").format("YYYY-MM-DD"),
                          }}
                          //min="2022-11-06T22:22:55"
                          InputLabelProps={{
                            shrink: true,
                          }}
                          error={
                            touched.collectiveVacationStart &&
                            Boolean(errors.collectiveVacationStart)
                          }
                          helperText={
                            touched.collectiveVacationStart &&
                            errors.collectiveVacationStart
                          }
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Field
                          fullWidth
                          as={TextField}
                          label={i18n.t(
                            "whatsappModal.form.collectiveVacationEnd"
                          )}
                          type="date"
                          name="collectiveVacationEnd"
                          required={
                            values.collectiveVacationMessage?.length > 0
                          }
                          inputProps={{
                            min: moment().add(-10, "days").format("YYYY-MM-DD"),
                          }}
                          //min="2022-11-06T22:22:55"
                          InputLabelProps={{
                            shrink: true,
                          }}
                          error={
                            touched.collectiveVacationEnd &&
                            Boolean(errors.collectiveVacationEnd)
                          }
                          helperText={
                            touched.collectiveVacationEnd &&
                            errors.collectiveVacationEnd
                          }
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                  </DialogContent>
                </TabPanel>

                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"chatbot"}
                >
                  <DialogContent className={classes.dialogContentModern}>
                    <Grid spacing={2} container>
                      {/* TEMPO PARA CRIAR NOVO TICKET */}
                      <Grid xs={6} md={3} item>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "whatsappModal.form.timeCreateNewTicket"
                          )}
                          fullWidth
                          name="timeCreateNewTicket"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.timeCreateNewTicket &&
                            Boolean(errors.timeCreateNewTicket)
                          }
                          helperText={
                            touched.timeCreateNewTicket &&
                            errors.timeCreateNewTicket
                          }
                        />
                      </Grid>

                      {/* QUANTIDADE MÁXIMA DE VEZES QUE O CHATBOT VAI SER ENVIADO */}
                      <Grid xs={6} md={3} item>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.maxUseBotQueues")}
                          fullWidth
                          name="maxUseBotQueues"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.maxUseBotQueues &&
                            Boolean(errors.maxUseBotQueues)
                          }
                          helperText={
                            touched.maxUseBotQueues && errors.maxUseBotQueues
                          }
                        />
                      </Grid>
                      {/* TEMPO PARA ENVIO DO CHATBOT */}
                      <Grid xs={6} md={3} item>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.timeUseBotQueues")}
                          fullWidth
                          name="timeUseBotQueues"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.timeUseBotQueues &&
                            Boolean(errors.timeUseBotQueues)
                          }
                          helperText={
                            touched.timeUseBotQueues && errors.timeUseBotQueues
                          }
                        />
                      </Grid>
                      {/* TEMPO PARA RETORNAR A FILA */}
                      <Grid xs={6} md={3} item>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.timeToReturnQueue")}
                          fullWidth
                          name="timeToReturnQueue"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.timeToReturnQueue &&
                            Boolean(errors.timeToReturnQueue)
                          }
                          helperText={
                            touched.timeToReturnQueue &&
                            errors.timeToReturnQueue
                          }
                        />
                      </Grid>
                    </Grid>
                    <Grid spacing={2} container>
                      {/* ENCERRAR CHATS ABERTOS APÓS X HORAS */}
                      <Grid xs={6} md={6} item>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.expiresTicket")}
                          fullWidth
                          name="expiresTicket"
                          required={values.timeInactiveMessage > 0}
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.expiresTicket &&
                            Boolean(errors.expiresTicket)
                          }
                          helperText={
                            touched.expiresTicket && errors.expiresTicket
                          }
                        />
                      </Grid>
                      {/* TEMPO PARA ENVIO DO CHATBOT */}
                      <Grid xs={6} md={6} item>
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          fullWidth
                        // className={classes.formControl}
                        >
                          <InputLabel id="whenExpiresTicket-selection-label">
                            {i18n.t("whatsappModal.form.whenExpiresTicket")}
                          </InputLabel>
                          <Field
                            as={Select}
                            label={i18n.t(
                              "whatsappModal.form.whenExpiresTicket"
                            )}
                            placeholder={i18n.t(
                              "whatsappModal.form.whenExpiresTicket"
                            )}
                            labelId="whenExpiresTicket-selection-label"
                            id="whenExpiresTicket"
                            name="whenExpiresTicket"
                          >
                            <MenuItem value={"0"}>
                              {i18n.t(
                                "whatsappModal.form.closeLastMessageOptions1"
                              )}
                            </MenuItem>
                            <MenuItem value={"1"}>
                              {i18n.t(
                                "whatsappModal.form.closeLastMessageOptions2"
                              )}
                            </MenuItem>
                          </Field>
                        </FormControl>
                      </Grid>
                    </Grid>
                    {/* MENSAGEM POR INATIVIDADE*/}
                    <div>
                      <Field
                        as={TextField}
                        label={i18n.t(
                          "whatsappModal.form.expiresInactiveMessage"
                        )}
                        multiline
                        rows={4}
                        fullWidth
                        name="expiresInactiveMessage"
                        error={
                          touched.expiresInactiveMessage &&
                          Boolean(errors.expiresInactiveMessage)
                        }
                        helperText={
                          touched.expiresInactiveMessage &&
                          errors.expiresInactiveMessage
                        }
                        variant="outlined"
                        margin="dense"
                      />
                    </div>

                    {/* TEMPO PARA ENVIO DE MENSAGEM POR INATIVIDADE */}
                    <Field
                      as={TextField}
                      label={i18n.t("whatsappModal.form.timeInactiveMessage")}
                      fullWidth
                      name="timeInactiveMessage"
                      variant="outlined"
                      margin="dense"
                      error={
                        touched.timeInactiveMessage &&
                        Boolean(errors.timeInactiveMessage)
                      }
                      helperText={
                        touched.timeInactiveMessage &&
                        errors.timeInactiveMessage
                      }
                    />
                    {/* MENSAGEM POR INATIVIDADE*/}
                    <div>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.inactiveMessage")}
                        multiline
                        rows={4}
                        fullWidth
                        name="inactiveMessage"
                        error={
                          touched.inactiveMessage &&
                          Boolean(errors.inactiveMessage)
                        }
                        helperText={
                          touched.inactiveMessage && errors.inactiveMessage
                        }
                        variant="outlined"
                        margin="dense"
                      />
                    </div>


                    <Grid spacing={2} container>
                      {user.showFlow === "enabled" && (
                        <>
                          {/* TEMPO PARA ENVIO DE MENSAGEM POR INATIVIDADE */}
                          <Grid xs={6} md={4} item>
                            <Field
                              as={TextField}
                              label={i18n.t("whatsappModal.form.flowInactiveTime")}
                              fullWidth
                              name="flowInactiveTime"
                              variant="outlined"
                              margin="dense"
                              error={
                                touched.flowIdInactiveTime &&
                                Boolean(errors.flowIdInactiveTime)
                              }
                              helperText={
                                touched.flowIdInactiveTime &&
                                errors.flowIdInactiveTime
                              }
                            />
                          </Grid>
                        </>
                      )}
                      {/* QUANTIDADE MÁXIMA DE VEZES QUE O FLOW DE INATIVIDADE VAI SER ENVIADO */}
                      <Grid xs={6} md={4} item>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "whatsappModal.form.maxUseInactiveTime"
                          )}
                          fullWidth
                          name="maxUseInactiveTime"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.maxUseInactiveTime &&
                            Boolean(errors.maxUseInactiveTime)
                          }
                          helperText={
                            touched.maxUseInactiveTime &&
                            errors.maxUseInactiveTime
                          }
                        />
                      </Grid>

                      {user.showFlow === "enabled" && (
                        <Grid xs={6} md={4} item>
                          {/* FLUXO DE INATIVIDADE */}
                          <div>
                            <FormControl
                              variant="outlined"
                              margin="dense"
                              className={classes.FormControl}
                              fullWidth
                            >
                              <Select
                                name="flowIdInactiveTime"
                                value={flowIdInactiveTime || ""}
                                onChange={handleChangeFlowIdInactiveTime}
                                id="flowIdInactiveTime"
                                variant="outlined"
                                margin="dense"
                                labelId="flowIdInactiveTime-selection-label"
                              >
                                <MenuItem value={null}>{"Desabilitado"}</MenuItem>
                                {webhooks.map((webhook) => (
                                  <MenuItem key={webhook.id} value={webhook.id}>
                                    {webhook.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </div>
                        </Grid>
                      )}
                    </Grid>

                    {/* <Grid spacing={2} container>
                      <Grid xs={6} md={4} item>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.timeAwaitActiveFlow")}
                          fullWidth
                          name="timeAwaitActiveFlow"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.timeAwaitActiveFlow &&
                            Boolean(errors.timeAwaitActiveFlow)
                          }
                          helperText={
                            touched.timeAwaitActiveFlow &&
                            errors.timeAwaitActiveFlow
                          }
                        />
                      </Grid>

                      <Grid xs={6} md={4} item>
                        <div>
                          <FormControl
                            variant="outlined"
                            margin="dense"
                            className={classes.FormControl}
                            fullWidth
                          >
                            <Select
                              name="timeAwaitActiveFlowId"
                              value={timeAwaitActiveFlowId || ""}
                              onChange={handleChangeTimeAwaitActiveFlowId}
                              id="timeAwaitActiveFlowId"
                              variant="outlined"
                              margin="dense"
                              labelId="timeAwaitActiveFlowId-selection-label"
                            >
                              <MenuItem value={null}>{"Desabilitado"}</MenuItem>
                              {webhooks.map((webhook) => (
                                <MenuItem key={webhook.id} value={webhook.id}>
                                  {webhook.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </div>
                      </Grid>
                    </Grid> */}
                  </DialogContent>
                </TabPanel>

                {/* NPS */}
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"nps"}
                >
                  <DialogContent className={classes.dialogContentModern}>
                    {/* MENSAGEM DE AVALIAÇAO*/}
                    <div>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.ratingMessage")}
                        multiline
                        rows={4}
                        fullWidth
                        name="ratingMessage"
                        error={
                          touched.ratingMessage && Boolean(errors.ratingMessage)
                        }
                        helperText={
                          touched.ratingMessage && errors.ratingMessage
                        }
                        variant="outlined"
                        margin="dense"
                      />
                    </div>
                    {/* QUANTIDADE MÁXIMA DE VEZES QUE O NPS VAI SER ENVIADO */}
                    <div>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.maxUseBotQueuesNPS")}
                        fullWidth
                        name="maxUseBotQueuesNPS"
                        variant="outlined"
                        margin="dense"
                        error={
                          touched.maxUseBotQueuesNPS &&
                          Boolean(errors.maxUseBotQueuesNPS)
                        }
                        helperText={
                          touched.maxUseBotQueuesNPS &&
                          errors.maxUseBotQueuesNPS
                        }
                      />
                    </div>
                    {/* ENCERRAR CHATS NPS APÓS X Minutos */}
                    <div>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.expiresTicketNPS")}
                        fullWidth
                        name="expiresTicketNPS"
                        variant="outlined"
                        margin="dense"
                        error={
                          touched.expiresTicketNPS &&
                          Boolean(errors.expiresTicketNPS)
                        }
                        helperText={
                          touched.expiresTicketNPS && errors.expiresTicketNPS
                        }
                      />
                    </div>
                  </DialogContent>
                </TabPanel>

                {/* Flowbuilder */}
                {showIntegrations && user.showFlow === "enabled" && (
                  <>
                    <TabPanel
                      className={classes.container}
                      value={tab}
                      name={"flowbuilder"}
                    >
                      <DialogContent className={classes.dialogContentModern}>
                        <div className={classes.sectionCard}>
                          <div className={classes.sectionTitle}>Fluxo de boas vindas</div>
                          <div className={classes.sectionSubtitle}>
                            Este fluxo é disparado apenas para novos contatos,
                            pessoas que você não possui em sua lista de contatos e
                            que mandaram uma mensagem
                          </div>
                          <FormControl variant="outlined" margin="dense" fullWidth>
                            <Select
                              name="flowIdNotPhrase"
                              value={flowIdNotPhrase || ""}
                              onChange={handleChangeFlowIdNotPhrase}
                              id="flowIdNotPhrase"
                              variant="outlined"
                              margin="dense"
                              labelId="flowIdNotPhrase-selection-label"
                            >
                              <MenuItem value={null}>{"Desabilitado"}</MenuItem>
                              {webhooks.map((webhook) => (
                                <MenuItem key={webhook.id} value={webhook.id}>
                                  {webhook.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </div>

                        <div className={classes.sectionCard}>
                          <div className={classes.sectionTitle}>Fluxo de resposta padrão</div>
                          <div className={classes.sectionSubtitle}>
                            Resposta Padrão é enviada com qualquer caractere
                            diferente de uma palavra chave. ATENÇÃO! Será
                            disparada se o atendimento ja estiver fechado.
                          </div>
                          <FormControl variant="outlined" margin="dense" fullWidth>
                            <Select
                              name="flowIdWelcome"
                              value={flowIdWelcome || ""}
                              onChange={handleChangeFlowIdWelcome}
                              id="flowIdWelcome"
                              variant="outlined"
                              margin="dense"
                              labelId="flowIdWelcome-selection-label"
                            >
                              <MenuItem value={null}>{"Desabilitado"}</MenuItem>
                              {webhooks.map((webhook) => (
                                <MenuItem key={webhook.id} value={webhook.id}>
                                  {webhook.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </div>
                      </DialogContent>
                    </TabPanel>
                  </>
                )}

                {/* Schedules */}
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"schedules"}
                >
                  {tab === "schedules" && (
                    <Paper style={{ padding: 20 }}>
                      <SchedulesForm
                        loading={false}
                        onSubmit={handleSaveSchedules}
                        initialValues={schedules}
                        labelSaveButton={i18n.t("whatsappModal.buttons.okAdd")}
                      />
                    </Paper>
                  )}
                </TabPanel>
              </Paper>
              <DialogActions className={classes.dialogActionsModern}>
                <Button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  variant="outlined"
                  className={classes.cancelButton}
                >
                  {i18n.t("whatsappModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {whatsAppId
                    ? i18n.t("whatsappModal.buttons.okEdit")
                    : i18n.t("whatsappModal.buttons.okAdd")}
                  {isSubmitting && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div >
  );
};

export default React.memo(WhatsAppModal);
