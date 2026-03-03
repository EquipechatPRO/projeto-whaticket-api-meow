import React, { useState } from "react";
import {
  makeStyles,
  Paper,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Divider,
  Box,
} from "@material-ui/core";
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  GetApp as DownloadIcon,
  CloudUpload as UploadIcon,
} from "@material-ui/icons";
import { toast } from "react-toastify";
import api from "../../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  section: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  description: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
  },
  buttonGroup: {
    display: "flex",
    gap: theme.spacing(2),
    flexWrap: "wrap",
  },
  dangerZone: {
    borderColor: theme.palette.error.main,
    border: "1px solid",
  },
  dangerTitle: {
    color: theme.palette.error.main,
  },
  hiddenInput: {
    display: "none",
  },
}));

const BackupRestore = () => {
  const classes = useStyles();
  const [loadingSQL, setLoadingSQL] = useState(false);
  const [loadingJSON, setLoadingJSON] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);

  const handleBackupSQL = async () => {
    setLoadingSQL(true);
    try {
      const response = await api.get("/backup/sql", {
        responseType: "blob",
      });

      const contentDisposition = response.headers["content-disposition"];
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Backup SQL baixado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar backup SQL.");
    }
    setLoadingSQL(false);
  };

  const handleBackupJSON = async () => {
    setLoadingJSON(true);
    try {
      const response = await api.get("/backup/json", {
        responseType: "blob",
      });

      const contentDisposition = response.headers["content-disposition"];
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Backup JSON baixado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar backup JSON.");
    }
    setLoadingJSON(false);
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".sql")) {
      toast.error("Apenas arquivos .sql são aceitos para restauração.");
      return;
    }

    const confirmRestore = window.confirm(
      "⚠️ ATENÇÃO: A restauração irá sobrescrever os dados atuais do banco. " +
        "Tem certeza que deseja continuar? Recomendamos fazer um backup antes."
    );

    if (!confirmRestore) {
      e.target.value = "";
      return;
    }

    setLoadingRestore(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await api.post("/backup/restore", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000, // 5 min para restaurações grandes
      });

      toast.success("Banco restaurado com sucesso! Recarregue a página.");
    } catch (err) {
      toast.error("Erro ao restaurar o banco de dados.");
    }
    setLoadingRestore(false);
    e.target.value = "";
  };

  return (
    <div className={classes.root}>
      {/* Seção de Backup */}
      <Paper className={classes.section} elevation={1}>
        <div className={classes.sectionTitle}>
          <BackupIcon color="primary" />
          <Typography variant="h6">Backup do Banco de Dados</Typography>
        </div>
        <Typography className={classes.description}>
          Faça o download de uma cópia completa do banco de dados. Escolha o
          formato desejado:
        </Typography>

        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              startIcon={
                loadingSQL ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <DownloadIcon />
                )
              }
              onClick={handleBackupSQL}
              disabled={loadingSQL || loadingJSON}
            >
              {loadingSQL ? "Gerando..." : "Backup SQL (.sql)"}
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              color="primary"
              startIcon={
                loadingJSON ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <DownloadIcon />
                )
              }
              onClick={handleBackupJSON}
              disabled={loadingSQL || loadingJSON}
            >
              {loadingJSON ? "Gerando..." : "Backup JSON (.json)"}
            </Button>
          </Grid>
        </Grid>

        <Box mt={2}>
          <Typography variant="caption" color="textSecondary">
            💡 O backup SQL é ideal para restauração completa. O backup JSON é
            útil para análise e migração de dados.
          </Typography>
        </Box>
      </Paper>

      {/* Seção de Restauração */}
      <Paper
        className={`${classes.section} ${classes.dangerZone}`}
        elevation={1}
      >
        <div className={classes.sectionTitle}>
          <RestoreIcon color="error" />
          <Typography variant="h6" className={classes.dangerTitle}>
            Restaurar Banco de Dados
          </Typography>
        </div>
        <Typography className={classes.description}>
          ⚠️ <strong>Zona de perigo:</strong> A restauração irá sobrescrever
          todos os dados atuais do banco. Certifique-se de ter um backup
          atualizado antes de prosseguir.
        </Typography>

        <input
          accept=".sql"
          className={classes.hiddenInput}
          id="restore-file-input"
          type="file"
          onChange={handleRestore}
          disabled={loadingRestore}
        />
        <label htmlFor="restore-file-input">
          <Button
            variant="contained"
            color="secondary"
            component="span"
            startIcon={
              loadingRestore ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <UploadIcon />
              )
            }
            disabled={loadingRestore}
          >
            {loadingRestore ? "Restaurando..." : "Enviar arquivo .sql para restaurar"}
          </Button>
        </label>
      </Paper>
    </div>
  );
};

export default BackupRestore;
