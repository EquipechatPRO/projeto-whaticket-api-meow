import { Router } from "express";
import {
  registerInstallation,
  listInstallations,
  installationStats
} from "../controllers/InstallationLogController";

const installationLogRoutes = Router();

// Endpoint público para o instalador postar os dados
installationLogRoutes.post("/monitor/installations", registerInstallation);

// Endpoints de leitura para o painel (protegidos por x-monitor-key)
installationLogRoutes.get("/monitor/installations", listInstallations);
installationLogRoutes.get("/monitor/installations/stats", installationStats);

export default installationLogRoutes;
