import React, { useState, useEffect, useContext, useRef } from "react";
import qs from "query-string";
import * as Yup from "yup";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import { Formik, Form, Field } from "formik";

import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import CircularProgress from "@material-ui/core/CircularProgress";
import { FormControl, InputLabel, MenuItem, Select } from "@material-ui/core";
import { Helmet } from "react-helmet";

import { openApi } from "../../services/api";
import toastError from "../../errors/toastError";
import useSettings from "../../hooks/useSettings";
import usePlans from "../../hooks/usePlans";
import ColorModeContext from "../../layout/themeContext";
import { getBackendUrl } from "../../config";
import { i18n } from "../../translate/i18n";
import BRFlag from "../../assets/brazil.png";
import USFlag from "../../assets/unitedstates.png";
import ESFlag from "../../assets/esspain.png";
import ARFlag from "../../assets/arabe.png";

const languageOptions = [
    { value: "pt-BR", label: "BR", icon: BRFlag },
    { value: "en", label: "EN", icon: USFlag },
    { value: "es", label: "ES", icon: ESFlag },
    { value: "ar", label: "AR", icon: ARFlag },
];

const useStyles = makeStyles((theme) => ({
    root: {
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#0a0a0a",
    },

    bannerSide: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        overflow: "hidden",
        [theme.breakpoints.down("sm")]: {
            display: "block",
        },
    },

    bannerImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center",
    },

    bannerFallback: {
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%)",
    },

    formSide: {
        width: "480px",
        minWidth: "480px",
        height: "calc(100% - 48px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(18, 20, 28, 0.82)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        padding: "32px",
        boxSizing: "border-box",
        overflowY: "auto",
        position: "absolute",
        right: 0,
        top: 0,
        zIndex: 1,
        borderRadius: "20px 0 0 20px",
        margin: "24px 0 24px 0",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.07)",
        [theme.breakpoints.down("sm")]: {
            width: "100%",
            minWidth: "unset",
            padding: "24px 20px",
            borderRadius: "20px 20px 0 0",
            margin: "auto 0 0 0",
            height: "auto",
            bottom: 0,
            top: "auto",
        },
    },

    langSelector: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "8px",
        padding: "6px 10px",
        fontSize: "13px",
        fontWeight: 600,
        color: "#c9d1d9",
        "&:hover": {
            borderColor: "rgba(255,255,255,0.25)",
        },
    },

    langDropdown: {
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: "6px",
        background: "#1e2130",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "6px",
        zIndex: 100,
        minWidth: "130px",
    },

    langOption: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        padding: "7px 10px",
        border: "none",
        background: "none",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: 500,
        color: "#c9d1d9",
        cursor: "pointer",
        textAlign: "left",
        "&:hover": {
            background: "rgba(255,255,255,0.06)",
        },
    },

    flagIcon: {
        width: 18,
        height: 13,
        borderRadius: 2,
        objectFit: "cover",
    },

    logoImg: {
        maxWidth: "180px",
        maxHeight: "54px",
        display: "block",
        marginBottom: "20px",
        objectFit: "contain",
        mixBlendMode: "screen",
    },

    tabsWrapper: {
        display: "flex",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: "10px",
        padding: "3px",
        width: "100%",
        marginBottom: "16px",
        border: "1px solid rgba(255,255,255,0.07)",
    },

    tab: {
        flex: 1,
        padding: "8px 0",
        border: "none",
        background: "transparent",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 500,
        cursor: "pointer",
        color: "#8b949e",
        transition: "all 0.2s ease",
    },

    tabActive: {
        background: "rgba(255,255,255,0.10)",
        color: "#e6edf3",
        fontWeight: 700,
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    },

    sectionTitle: {
        fontSize: "18px",
        fontWeight: 700,
        color: "#e6edf3",
        marginBottom: "4px",
    },

    subtitle: {
        fontSize: "13px",
        color: "#8b949e",
        marginBottom: "16px",
    },

    planCard: {
        border: "2px solid rgba(255,255,255,0.10)",
        borderRadius: "12px",
        padding: "14px 16px",
        marginBottom: "16px",
        width: "100%",
        boxSizing: "border-box",
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
            borderColor: theme.palette.primary.main,
        },
    },

    planCardSelected: {
        borderColor: theme.palette.primary.main,
        backgroundColor: `${theme.palette.primary.main}18`,
    },

    planName: {
        fontSize: "15px",
        fontWeight: 700,
        color: "#e6edf3",
    },

    planPrice: {
        fontSize: "15px",
        fontWeight: 700,
        color: "#e6edf3",
    },

    planBadge: {
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 600,
        color: theme.palette.primary.main,
        marginBottom: "6px",
    },

    planChip: {
        display: "inline-block",
        background: "rgba(255,255,255,0.08)",
        borderRadius: "4px",
        padding: "2px 7px",
        fontSize: "11px",
        color: "#c9d1d9",
        marginRight: "4px",
        marginBottom: "4px",
    },

    planMeta: {
        fontSize: "11px",
        color: "#8b949e",
        marginTop: "6px",
    },

    submitButton: {
        width: "100%",
        padding: "12px 0",
        borderRadius: "8px",
        fontSize: "15px",
        fontWeight: 700,
        textTransform: "none",
        color: "#fff",
        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark || theme.palette.primary.main})`,
        boxShadow: `0 4px 14px ${theme.palette.primary.main}55`,
        border: "none",
        marginTop: "8px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        "&:hover": {
            opacity: 0.92,
            transform: "translateY(-1px)",
        },
    },

    loginLink: {
        marginTop: "16px",
        fontSize: "13px",
        color: "#8b949e",
        textAlign: "center",
        "& a": {
            color: theme.palette.primary.main,
            fontWeight: 600,
            textDecoration: "none",
            "&:hover": {
                textDecoration: "underline",
            },
        },
    },

    footer: {
        marginTop: "20px",
        textAlign: "center",
        fontSize: "11px",
        color: "#8b949e",
    },

    textField: {
        marginBottom: "10px",
        "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            fontSize: "13px",
            backgroundColor: "rgba(255,255,255,0.05)",
            color: "#e6edf3",
            "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
            "&:hover fieldset": { borderColor: "rgba(255,255,255,0.22)" },
            "&.Mui-focused fieldset": {
                borderColor: theme.palette.primary.main,
                borderWidth: "1.5px",
            },
        },
        "& .MuiInputLabel-outlined": { fontSize: "13px", color: "#8b949e" },
        "& .MuiInputLabel-outlined.Mui-focused": { color: theme.palette.primary.main },
        "& .MuiInputBase-input": { color: "#e6edf3" },
    },
}));

const UserSchema = Yup.object().shape({
    name: Yup.string().min(2).max(50).required("Required"),
    companyName: Yup.string().min(2).max(50).required("Required"),
    document: Yup.string().notRequired(),
    password: Yup.string().min(5).max(50),
    email: Yup.string().email("Invalid email").required("Required"),
    phone: Yup.string().required("Required"),
});

// Etapa 1: escolha de plano; Etapa 2: dados da empresa
const STEP_PLAN = "plan";
const STEP_FORM = "form";

const SignUp = () => {
    const classes = useStyles();
    const history = useHistory();
    const { colorMode } = useContext(ColorModeContext);
    const { appLogoFavicon, appName, appLogoDark, appLogoLight, mode } = colorMode;
    const { getPlanList } = usePlans();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [validatingCnpj, setValidatingCnpj] = useState(false);
    const [lastValidatedDocument, setLastValidatedDocument] = useState("");
    const { getPublicSetting } = useSettings();
    const [bannerUrl, setBannerUrl] = useState("");
    const [enabledLanguages, setEnabledLanguages] = useState(["pt-BR", "en"]);
    const [langOpen, setLangOpen] = useState(false);
    const [step, setStep] = useState(STEP_PLAN);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [requireDocument, setRequireDocument] = useState(false);
    const langRef = useRef();

    let companyId = null;
    const params = qs.parse(window.location.search);
    if (params.companyId !== undefined) companyId = params.companyId;

    const initialState = {
        name: "", email: "", password: "", phone: "",
        companyId, companyName: "", document: "", planId: "",
    };
    const [user] = useState(initialState);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handler = (e) => {
            if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        getPublicSetting("userCreation")
            .then((data) => {
                if (data === "disabled") {
                    toast.error(i18n.t("signup.toasts.disabled"));
                    history.push("/login");
                }
            })
            .catch(() => {});

        getPublicSetting("requireDocument")
            .then((data) => setRequireDocument(data === "enabled"))
            .catch(() => {});

        getPublicSetting("enabledLanguages", companyId)
            .then((langs) => {
                let arr = ["pt-BR", "en"];
                try { if (langs) arr = JSON.parse(langs); } catch {}
                setEnabledLanguages(arr);
            })
            .catch(() => {});

        const bgKey = mode === "light" ? "appLogoBackgroundLight" : "appLogoBackgroundDark";
        getPublicSetting(bgKey, companyId)
            .then((bg) => { if (bg) setBannerUrl(getBackendUrl() + "/public/" + bg); })
            .catch(() => {});
    }, [history, companyId]);

    useEffect(() => {
        setLoading(true);
        getPlanList({ listPublic: "false" })
            .then((list) => { setPlans(list); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Formatação de documento — se contém letras é documento estrangeiro, não formata
    const formatDocument = (value) => {
        if (/[a-zA-Z]/.test(value)) return value; // documento estrangeiro: aceita como digitado
        const n = value.replace(/\D/g, "");
        if (n.length <= 11) {
            if (n.length <= 3) return n;
            if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
            if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
            return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9, 11)}`;
        }
        const m = n.slice(0, 14);
        if (m.length <= 2) return m;
        if (m.length <= 5) return `${m.slice(0, 2)}.${m.slice(2)}`;
        if (m.length <= 8) return `${m.slice(0, 2)}.${m.slice(2, 5)}.${m.slice(5)}`;
        if (m.length <= 12) return `${m.slice(0, 2)}.${m.slice(2, 5)}.${m.slice(5, 8)}/${m.slice(8)}`;
        return `${m.slice(0, 2)}.${m.slice(2, 5)}.${m.slice(5, 8)}/${m.slice(8, 12)}-${m.slice(12)}`;
    };

    const validateDocument = async (document, setFieldValue) => {
        // Campo opcional — se vazio, aceita sem validar
        if (!document || !document.trim()) return true;

        const clean = document.replace(/\D/g, "");

        // Documento estrangeiro (contém letras ou não tem 11/14 dígitos numéricos puros)
        const hasLetters = /[a-zA-Z]/.test(document.trim());
        const isForeign = hasLetters || (clean.length !== 11 && clean.length !== 14 && document.trim().length > 0);
        if (isForeign) {
            // Aceita qualquer documento estrangeiro sem validação adicional
            return true;
        }

        if (lastValidatedDocument === clean) return true;
        setLastValidatedDocument(clean);

        if (clean.length === 11) {
            toast.success("CPF válido!");
            return true;
        }
        if (clean.length === 14) {
            setValidatingCnpj(true);
            try {
                const res = await openApi.post("/auth/validate-cnpj", { cnpj: clean });
                setValidatingCnpj(false);
                if (res.data.valid && res.data.data.nome) {
                    setFieldValue("companyName", res.data.data.nome);
                    toast.success("CNPJ válido! Nome preenchido automaticamente.");
                    return true;
                }
                toast.error("Documento inválido.");
                return false;
            } catch {
                setValidatingCnpj(false);
                toast.error("Erro ao validar documento.");
                return false;
            }
        }
        // Número com comprimento diferente de 11 ou 14 — aceita como documento estrangeiro
        return true;
    };

    const [signingUp, setSigningUp] = useState(false);

    const handleSignUp = async (values, actions) => {
        if (signingUp) return;
        setSigningUp(true);
        try {
            await openApi.post("/auth/signup", values);
            toast.success(i18n.t("signup.toasts.success"));
            history.push("/login");
        } catch (err) {
            toastError(err);
            setSigningUp(false);
            if (actions) actions.setSubmitting(false);
        }
    };

    const currentLang = languageOptions.find((o) => o.value === i18n.language) || languageOptions[0];

    const handleSelectLang = (opt) => {
        i18n.changeLanguage(opt.value);
        localStorage.setItem("language", opt.value);
        setLangOpen(false);
        window.location.reload();
    };

    const getPlanFeatures = (plan) => {
        const features = [];
        if (plan.useWhatsapp) features.push("WhatsApp");
        if (plan.useFacebook) features.push("Facebook");
        if (plan.useInstagram) features.push("Instagram");
        if (plan.useCampaigns) features.push("Campanhas");
        if (plan.useSchedules) features.push("Agendamentos");
        if (plan.useInternalChat) features.push("Chat Interno");
        if (plan.useExternalApi) features.push("API Externa");
        if (plan.useIntegrations) features.push("Integrações");
        if (plan.useOpenAi) features.push("OpenAI");
        if (plan.useKanban) features.push("Kanban");
        return features;
    };

    return (
        <React.Fragment>
            <Helmet>
                <title>{appName || "Equipechat - Cadastro"}</title>
                <link rel="icon" href={appLogoFavicon || "/default-favicon.ico"} />
            </Helmet>

            <div className={classes.root}>
                <CssBaseline />

                {/* BANNER */}
                <div className={classes.bannerSide}>
                    {bannerUrl ? (
                        <img src={bannerUrl} alt="banner" className={classes.bannerImage} />
                    ) : (
                        <div className={classes.bannerFallback} />
                    )}
                </div>

                {/* FORMULÁRIO */}
                <div className={classes.formSide}>

                    {/* Seletor de idioma */}
                    <div ref={langRef} style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
                        <button className={classes.langSelector} onClick={() => setLangOpen((o) => !o)}>
                            <img src={currentLang.icon} alt={currentLang.label} className={classes.flagIcon} />
                            {currentLang.label}
                            <span style={{ fontSize: 10, color: "#9ca3af" }}>▾</span>
                        </button>
                        {langOpen && (
                            <div className={classes.langDropdown}>
                                {languageOptions
                                    .filter((o) => enabledLanguages.includes(o.value))
                                    .map((opt) => (
                                        <button key={opt.value} className={classes.langOption} onClick={() => handleSelectLang(opt)}>
                                            <img src={opt.icon} alt={opt.label} className={classes.flagIcon} />
                                            {opt.label}
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Logo */}
                    <img
                        className={classes.logoImg}
                        src={appLogoDark || appLogoLight}
                        alt={appName || "Logo"}
                    />

                    {/* Abas */}
                    <div className={classes.tabsWrapper}>
                        <button className={classes.tab} onClick={() => history.push("/login")}>
                            Login
                        </button>
                        <button className={`${classes.tab} ${classes.tabActive}`}>
                            Cadastre-se
                        </button>
                    </div>

                    {/* ETAPA 1 - Escolha de plano */}
                    {step === STEP_PLAN && (
                        <>
                            <Typography className={classes.sectionTitle}>Escolha seu Plano</Typography>
                            <Typography className={classes.subtitle}>
                                Selecione o plano ideal para sua empresa
                            </Typography>

                            {loading ? (
                                <CircularProgress size={28} style={{ margin: "20px auto" }} />
                            ) : (
                                <div style={{ width: "100%", maxHeight: "340px", overflowY: "auto" }}>
                                    {plans.map((plan) => {
                                        const features = getPlanFeatures(plan);
                                        const isSelected = selectedPlan?.id === plan.id;
                                        return (
                                            <div
                                                key={plan.id}
                                                className={`${classes.planCard} ${isSelected ? classes.planCardSelected : ""}`}
                                                onClick={() => setSelectedPlan(plan)}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                    <span className={classes.planName}>{plan.name}</span>
                                                    <span className={classes.planPrice}>
                                                        R$ {parseFloat(plan.amount || 0).toFixed(2).replace(".", ",")}/mês
                                                    </span>
                                                </div>
                                                <div className={classes.planBadge}>Ideal para sua empresa</div>
                                                <div>
                                                    {features.map((f) => (
                                                        <span key={f} className={classes.planChip}>{f}</span>
                                                    ))}
                                                </div>
                                                <div className={classes.planMeta}>
                                                    Até {plan.users || "?"} usuários · Até {plan.connections || "?"} conexões
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                className={classes.submitButton}
                                disabled={!selectedPlan}
                                onClick={() => setStep(STEP_FORM)}
                            >
                                Continuar
                            </Button>

                            <div className={classes.loginLink}>
                                Já tem uma conta?{" "}
                                <a href="/login" onClick={(e) => { e.preventDefault(); history.push("/login"); }}>
                                    Entre!
                                </a>
                            </div>
                        </>
                    )}

                    {/* ETAPA 2 - Dados da empresa */}
                    {step === STEP_FORM && (
                        <>
                            <Typography className={classes.sectionTitle}>Criar sua conta</Typography>
                            <Typography className={classes.subtitle}>
                                Preencha os dados da sua empresa
                            </Typography>

                            <Formik
                                initialValues={{ ...user, planId: selectedPlan?.id || "" }}
                                enableReinitialize
                                validationSchema={UserSchema}
                                onSubmit={async (values, actions) => {
                                    actions.setSubmitting(true);
                                    await handleSignUp(values, actions);
                                }}
                            >
                                {({ touched, errors, isSubmitting, setFieldValue, values }) => (
                                    <Form style={{ width: "100%" }}>
                                        <Grid container spacing={1}>
                                            <Grid item xs={12} sm={6}>
                                                <Field
                                                    as={TextField}
                                                    variant="outlined"
                                                    fullWidth
                                                    size="small"
                                                    label="Nome"
                                                    name="name"
                                                    className={classes.textField}
                                                    error={touched.name && Boolean(errors.name)}
                                                    helperText={touched.name && errors.name}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Field
                                                    as={TextField}
                                                    variant="outlined"
                                                    fullWidth
                                                    size="small"
                                                    label="Empresa"
                                                    name="companyName"
                                                    className={classes.textField}
                                                    error={touched.companyName && Boolean(errors.companyName)}
                                                    helperText={touched.companyName && errors.companyName}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                {requireDocument && (
                                                    <Field
                                                        as={TextField}
                                                        variant="outlined"
                                                        fullWidth
                                                        size="small"
                                                        label="CPF / CNPJ / Documento (opcional)"
                                                        name="document"
                                                        className={classes.textField}
                                                        error={touched.document && Boolean(errors.document)}
                                                        helperText={touched.document && errors.document}
                                                        onChange={(e) => setFieldValue("document", formatDocument(e.target.value))}
                                                        onBlur={() => validateDocument(values.document, setFieldValue)}
                                                        InputProps={{
                                                            endAdornment: validatingCnpj && (
                                                                <CircularProgress size={16} />
                                                            ),
                                                        }}
                                                    />
                                                )}
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Field
                                                    as={TextField}
                                                    variant="outlined"
                                                    fullWidth
                                                    size="small"
                                                    label="Telefone"
                                                    name="phone"
                                                    className={classes.textField}
                                                    error={touched.phone && Boolean(errors.phone)}
                                                    helperText={touched.phone && errors.phone}
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Field
                                                    as={TextField}
                                                    variant="outlined"
                                                    fullWidth
                                                    size="small"
                                                    label="E-mail"
                                                    name="email"
                                                    className={classes.textField}
                                                    error={touched.email && Boolean(errors.email)}
                                                    helperText={touched.email && errors.email}
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Field
                                                    as={TextField}
                                                    variant="outlined"
                                                    fullWidth
                                                    size="small"
                                                    label="Senha"
                                                    type="password"
                                                    name="password"
                                                    className={classes.textField}
                                                    error={touched.password && Boolean(errors.password)}
                                                    helperText={touched.password && errors.password}
                                                />
                                            </Grid>
                                        </Grid>

                                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                            <Button
                                                variant="outlined"
                                                style={{ flex: 1, borderRadius: 8, textTransform: "none", fontSize: 14, color: "#c9d1d9", borderColor: "rgba(255,255,255,0.25)" }}
                                                onClick={() => setStep(STEP_PLAN)}
                                            >
                                                Voltar
                                            </Button>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                color="primary"
                                                disabled={isSubmitting || signingUp}
                                                className={classes.submitButton}
                                                style={{ flex: 2 }}
                                            >
                                                {(isSubmitting || signingUp) ? <CircularProgress size={20} color="inherit" /> : "Criar Conta"}
                                            </Button>
                                        </div>
                                    </Form>
                                )}
                            </Formik>

                            <div className={classes.loginLink}>
                                Já tem uma conta?{" "}
                                <a href="/login" onClick={(e) => { e.preventDefault(); history.push("/login"); }}>
                                    Entrar
                                </a>
                            </div>
                        </>
                    )}

                    <div className={classes.footer}>
                        © {new Date().getFullYear()} {appName || "Sistema"}. Todos os direitos reservados.
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
};

export default SignUp;
