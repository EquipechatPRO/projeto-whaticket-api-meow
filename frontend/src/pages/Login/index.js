import React, { useState, useContext, useEffect, useRef } from "react";
import { Link as RouterLink, useHistory } from "react-router-dom";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import InputAdornment from "@material-ui/core/InputAdornment";
import { Helmet } from "react-helmet";
import BRFlag from "../../assets/brazil.png";
import USFlag from "../../assets/unitedstates.png";
import ESFlag from "../../assets/esspain.png";
import ARFlag from "../../assets/arabe.png";
import { getBackendUrl } from "../../config";
import packageJson from "../../../package.json";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import ColorModeContext from "../../layout/themeContext";
import useSettings from "../../hooks/useSettings";

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

    // Lado esquerdo - banner (ocupa tela toda atrás)
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },

    // Lado direito - formulário (sobreposto ao banner)
    formSide: {
        width: "420px",
        minWidth: "420px",
        height: "calc(100% - 48px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(18, 20, 28, 0.82)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        padding: "40px 32px",
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
            padding: "32px 24px",
            borderRadius: "20px 20px 0 0",
            margin: "auto 0 0 0",
            height: "auto",
            bottom: 0,
            top: "auto",
        },
    },

    // Seletor de idioma (canto superior direito do form)
    langSelector: {
        position: "absolute",
        top: "20px",
        right: "20px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "8px",
        padding: "6px 10px",
        fontSize: "13px",
        fontWeight: 600,
        color: "#c9d1d9",
        zIndex: 10,
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

    // Logo
    logoImg: {
        maxWidth: "200px",
        maxHeight: "60px",
        display: "block",
        marginBottom: "24px",
        objectFit: "contain",
        mixBlendMode: "screen",
    },

    // Abas Login / Cadastre-se
    tabsWrapper: {
        display: "flex",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: "10px",
        padding: "3px",
        width: "100%",
        marginBottom: "20px",
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

    subtitle: {
        fontSize: "13px",
        color: "#8b949e",
        marginBottom: "20px",
        textAlign: "center",
    },

    inputLabel: {
        fontSize: "13px",
        fontWeight: 600,
        color: "#c9d1d9",
        marginBottom: "4px",
        display: "block",
        textAlign: "left",
        width: "100%",
    },

    textField: {
        marginBottom: "14px",
        "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            fontSize: "14px",
            backgroundColor: "rgba(255,255,255,0.05)",
            color: "#e6edf3",
            "& fieldset": {
                borderColor: "rgba(255,255,255,0.12)",
            },
            "&:hover fieldset": {
                borderColor: "rgba(255,255,255,0.22)",
            },
            "&.Mui-focused fieldset": {
                borderColor: theme.palette.primary.main,
                borderWidth: "1.5px",
            },
        },
        "& .MuiInputLabel-outlined": {
            fontSize: "14px",
            color: "#8b949e",
        },
        "& .MuiInputLabel-outlined.Mui-focused": {
            color: theme.palette.primary.main,
        },
        "& .MuiInputBase-input": {
            color: "#e6edf3",
        },
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
            boxShadow: `0 6px 20px ${theme.palette.primary.main}66`,
        },
    },

    footer: {
        marginTop: "24px",
        textAlign: "center",
        fontSize: "12px",
        color: "#8b949e",
    },

    versionBadge: {
        position: "absolute",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: "11px",
        color: "#8b949e",
    },
}));

const Login = () => {
    const classes = useStyles();
    const theme = useTheme();
    const history = useHistory();
    const { colorMode } = useContext(ColorModeContext);
    const { appLogoFavicon, appName, appLogoDark, appLogoLight, mode } = colorMode;
    const [user, setUser] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [allowSignup, setAllowSignup] = useState(false);
    const { getPublicSetting } = useSettings();
    const { handleLogin } = useContext(AuthContext);

    const [langOpen, setLangOpen] = useState(false);
    const [enabledLanguages, setEnabledLanguages] = useState(["pt-BR", "en"]);
    const [bannerUrl, setBannerUrl] = useState("");

    const langRef = useRef();

    // Fechar dropdown de idioma ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (langRef.current && !langRef.current.contains(e.target)) {
                setLangOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getCompanyIdFromUrl = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const companyId = urlParams.get("companyId");
        return companyId ? parseInt(companyId) : null;
    };

    useEffect(() => {
        const companyId = getCompanyIdFromUrl();

        getPublicSetting("userCreation", companyId)
            .then((data) => setAllowSignup(data === "enabled"))
            .catch(() => {});

        getPublicSetting("enabledLanguages", companyId)
            .then((langs) => {
                let arr = ["pt-BR", "en"];
                try { if (langs) arr = JSON.parse(langs); } catch {}
                setEnabledLanguages(arr);
            })
            .catch(() => setEnabledLanguages(["pt-BR", "en"]));

        // Banner: usa background light para modo claro, dark para modo escuro
        const bgKey = mode === "light" ? "appLogoBackgroundLight" : "appLogoBackgroundDark";
        getPublicSetting(bgKey, companyId)
            .then((bg) => {
                if (bg) {
                    setBannerUrl(getBackendUrl() + "/public/" + bg);
                }
            })
            .catch(() => {});
    }, []);

    const handleChangeInput = (e) => {
        setUser({ ...user, [e.target.name]: e.target.value });
    };

    const handlSubmit = (e) => {
        e.preventDefault();
        handleLogin(user);
    };

    const currentLang = languageOptions.find((o) => o.value === i18n.language) || languageOptions[0];

    const handleSelectLang = (opt) => {
        i18n.changeLanguage(opt.value);
        localStorage.setItem("language", opt.value);
        setLangOpen(false);
        window.location.reload();
    };

    return (
        <>
            <Helmet>
                <title>{appName || "Equipechat"}</title>
                <link rel="icon" href={appLogoFavicon || "/default-favicon.ico"} />
            </Helmet>

            <div className={classes.root}>
                <CssBaseline />

                {/* LADO ESQUERDO - BANNER */}
                <div className={classes.bannerSide}>
                    {bannerUrl ? (
                        <img
                            src={bannerUrl}
                            alt="banner"
                            className={classes.bannerImage}
                        />
                    ) : (
                        <div className={classes.bannerFallback} />
                    )}
                </div>

                {/* LADO DIREITO - FORMULÁRIO */}
                <div className={classes.formSide}>

                    {/* Seletor de idioma */}
                    <div ref={langRef} style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
                        <button
                            className={classes.langSelector}
                            onClick={() => setLangOpen((o) => !o)}
                            style={{ display: "flex", alignItems: "center", gap: 6 }}
                        >
                            <img src={currentLang.icon} alt={currentLang.label} className={classes.flagIcon} />
                            {currentLang.label}
                            <span style={{ fontSize: 10, color: "#9ca3af" }}>▾</span>
                        </button>
                        {langOpen && (
                            <div className={classes.langDropdown}>
                                {languageOptions
                                    .filter((o) => enabledLanguages.includes(o.value))
                                    .map((opt) => (
                                        <button
                                            key={opt.value}
                                            className={classes.langOption}
                                            onClick={() => handleSelectLang(opt)}
                                        >
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

                    {/* Abas Login / Cadastre-se */}
                    <div className={classes.tabsWrapper}>
                        <button className={`${classes.tab} ${classes.tabActive}`}>
                            {i18n.t("login.buttons.submit") || "Login"}
                        </button>
                        {allowSignup && (
                            <button
                                className={classes.tab}
                                onClick={() => history.push("/signup")}
                            >
                                Cadastre-se
                            </button>
                        )}
                    </div>

                    <Typography className={classes.subtitle}>
                        Entre com suas credenciais para acessar o sistema
                    </Typography>

                    {/* Formulário */}
                    <form
                        noValidate
                        onSubmit={handlSubmit}
                        style={{ width: "100%" }}
                    >
                        <label className={classes.inputLabel}>
                            {i18n.t("login.form.email") || "E-mail"}
                        </label>
                        <TextField
                            variant="outlined"
                            required
                            fullWidth
                            id="email"
                            placeholder="Email"
                            name="email"
                            value={user.email}
                            onChange={handleChangeInput}
                            autoComplete="email"
                            autoFocus
                            size="small"
                            className={classes.textField}
                        />

                        <label className={classes.inputLabel}>
                            {i18n.t("login.form.password") || "Senha"}
                        </label>
                        <TextField
                            variant="outlined"
                            required
                            fullWidth
                            name="password"
                            placeholder="Senha"
                            type={showPassword ? "text" : "password"}
                            id="password"
                            value={user.password}
                            onChange={handleChangeInput}
                            autoComplete="current-password"
                            size="small"
                            className={classes.textField}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword((s) => !s)}
                                            edge="end"
                                            size="small"
                                            style={{ color: "#9ca3af" }}
                                        >
                                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="primary"
                            className={classes.submitButton}
                        >
                            {i18n.t("login.buttons.submit") || "Login"}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className={classes.footer}>
                        © {new Date().getFullYear()} {appName || "Sistema"}. Todos os direitos reservados.
                        <br />
                        <span style={{ fontSize: "11px" }}>v{packageJson.version}</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;
