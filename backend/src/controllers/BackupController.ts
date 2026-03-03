import { Request, Response } from "express";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { Sequelize } from "sequelize";
import database from "../database";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || "5432",
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS
});

export const backupSQL = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const config = getDbConfig();

  if (!config.database || !config.username) {
    return res.status(500).json({ error: "Configuração do banco incompleta." });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup_${config.database}_${timestamp}.sql`;
  const filePath = path.join(os.tmpdir(), filename);

  const env = { ...process.env, PGPASSWORD: config.password };

  const cmd = `pg_dump -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database} -F p --no-owner --no-acl -f "${filePath}"`;

  return new Promise((resolve) => {
    exec(cmd, { env }, (error) => {
      if (error) {
        console.error("Backup SQL error:", error.message);
        res.status(500).json({ error: "Falha ao gerar backup SQL." });
        return resolve(undefined);
      }

      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/sql");

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on("end", () => {
        fs.unlink(filePath, () => {});
      });
      stream.on("error", () => {
        fs.unlink(filePath, () => {});
        res.status(500).json({ error: "Erro ao enviar arquivo." });
      });

      resolve(undefined);
    });
  });
};

export const backupJSON = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const sequelize = database as unknown as Sequelize;

    const [tables]: any = await sequelize.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );

    const backup: Record<string, any[]> = {};

    for (const { tablename } of tables) {
      const [rows]: any = await sequelize.query(
        `SELECT * FROM "${tablename}"`
      );
      backup[tablename] = rows;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup_${process.env.DB_NAME}_${timestamp}.json`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json(backup);
  } catch (error: any) {
    console.error("Backup JSON error:", error.message);
    return res.status(500).json({ error: "Falha ao gerar backup JSON." });
  }
};

export const restoreSQL = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const file = req.file as Express.Multer.File;

  if (!file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado." });
  }

  const config = getDbConfig();

  if (!config.database || !config.username) {
    return res.status(500).json({ error: "Configuração do banco incompleta." });
  }

  const env = { ...process.env, PGPASSWORD: config.password };

  const cmd = `psql -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database} -f "${file.path}"`;

  return new Promise((resolve) => {
    exec(cmd, { env }, (error, stdout, stderr) => {
      // Limpar arquivo temporário
      fs.unlink(file.path, () => {});

      if (error) {
        console.error("Restore SQL error:", error.message);
        resolve(
          res.status(500).json({
            error: "Falha ao restaurar backup.",
            details: stderr
          })
        );
        return;
      }

      resolve(
        res.status(200).json({
          message: "Banco restaurado com sucesso.",
          details: stdout
        })
      );
    });
  });
};
