import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import ImportContactsService from "../services/WbotServices/ImportContactsService";
import GetDefaultWhatsApp from "../helpers/GetDefaultWhatsApp";
import { getWbot } from "../libs/wbot";
import Baileys from "../models/Baileys";
import Contact from "../models/Contact";
import logger from "../utils/logger";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { whatsappId } = req.body;

  // Responder imediatamente e processar em background
  res.status(200).json({ message: "Importação iniciada", status: "started" });

  // Executar importação em background (não bloqueia a resposta)
  ImportContactsService(companyId, whatsappId ? Number(whatsappId) : undefined).catch(err => {
    if (err.message && err.message.includes("sincroniz")) {
      logger.warn(`ImportContacts background: Contatos não sincronizados para company ${companyId}`);
    } else {
      logger.error(`ImportContacts background: Erro para company ${companyId}: ${err.message}`);
    }
  });

  return res;
};

export const syncStatus = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  try {
    let defaultWhatsapp;
    try {
      defaultWhatsapp = await GetDefaultWhatsApp(companyId);
    } catch {
      return res.status(200).json({
        synced: false,
        status: "no_connection",
        message: "Nenhuma conexão WhatsApp padrão encontrada.",
        contactsInDb: 0,
        contactsInSync: 0
      });
    }

    let wbot;
    try {
      wbot = getWbot(defaultWhatsapp.id);
    } catch {
      return res.status(200).json({
        synced: false,
        status: "disconnected",
        message: "WhatsApp não está conectado. Reconecte e aguarde a sincronização.",
        contactsInDb: 0,
        contactsInSync: 0
      });
    }

    const contactsInDb = await Contact.count({ where: { companyId } });

    const publicFolder = path.resolve(__dirname, "..", "..", "public");
    const companyFolder = path.join(publicFolder, `company${companyId}`);
    const scopedContactJsonPath = path.join(
      companyFolder,
      `contactJson-wpp${defaultWhatsapp.id}.txt`
    );
    let contactsInFile = 0;

    if (fs.existsSync(scopedContactJsonPath)) {
      try {
        const content = fs.readFileSync(scopedContactJsonPath, "utf-8").trim();
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) contactsInFile = parsed.length;
      } catch {}
    }

    let contactsInBaileys = 0;
    try {
      const baileysData = await Baileys.findOne({
        where: { whatsappId: defaultWhatsapp.id }
      });
      if (baileysData && baileysData.contacts) {
        const contacts = typeof baileysData.contacts === "string"
          ? JSON.parse(baileysData.contacts)
          : baileysData.contacts;
        if (Array.isArray(contacts)) contactsInBaileys = contacts.length;
      }
    } catch {}

    const contactsInSync = Math.max(contactsInFile, contactsInBaileys);
    const MIN_SYNC_CONTACTS = 2;
    const synced = contactsInSync >= MIN_SYNC_CONTACTS;

    return res.status(200).json({
      synced,
      status: synced ? "ready" : "syncing",
      message: synced
        ? `Sincronização concluída. ${contactsInSync} contatos disponíveis para importação.`
        : `Aguardando sincronização dos contatos. Contatos sincronizados até agora: ${contactsInSync}.`,
      contactsInDb,
      contactsInSync,
      source: contactsInFile > 0 ? "file" : contactsInBaileys > 0 ? "baileys" : "none"
    });
  } catch (err) {
    logger.error(`SyncStatus: Erro ao verificar status para company ${companyId}: ${err.message}`);
    return res.status(500).json({
      error: true,
      message: "Erro ao verificar status da sincronização."
    });
  }
};
