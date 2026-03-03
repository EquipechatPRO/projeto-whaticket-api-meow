import { getWbot } from "../../libs/wbot";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import Message from "../../models/Message";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";

interface Request {
  ticketId?: number;
  ticketUuid?: string;
  companyId: number;
  count?: number;
}

const FetchMessageHistoryService = async ({
  ticketId,
  ticketUuid,
  companyId,
  count = 50
}: Request): Promise<{ requested: boolean; messageId?: string }> => {
  if ((!ticketId && !ticketUuid) || !companyId) {
    throw new Error("ERR_INVALID_FETCH_HISTORY_PARAMS");
  }

  const ticketWhere: any = { companyId };
  if (ticketId && Number.isFinite(ticketId)) {
    ticketWhere.id = ticketId;
  } else if (ticketUuid) {
    ticketWhere.uuid = ticketUuid;
  }

  const ticket = await Ticket.findOne({
    where: ticketWhere,
    include: [
      { model: Whatsapp, as: "whatsapp" },
      { model: Contact, as: "contact", attributes: ["id", "number", "remoteJid"] }
    ]
  });

  if (!ticket) {
    throw new Error("ERR_NO_TICKET_FOUND");
  }

  if (!ticket.whatsappId || String(ticket.whatsappId) === "null") {
    throw new Error("ERR_NO_WHATSAPP_LINKED");
  }

  const whatsapp = ticket.whatsapp;

  if (!whatsapp || whatsapp.status !== "CONNECTED") {
    throw new Error("ERR_WHATSAPP_NOT_CONNECTED");
  }

  // Só funciona para Baileys (não-oficial)
  if (whatsapp.channel === "whatsapp_oficial") {
    throw new Error("ERR_NOT_SUPPORTED_FOR_OFFICIAL");
  }

  const jid = ticket.contact?.remoteJid || (ticket.contact?.number ? `${ticket.contact.number}@s.whatsapp.net` : null);
  if (!jid) {
    throw new Error("ERR_CONTACT_JID_NOT_FOUND");
  }

  const wbot = getWbot(whatsapp.id);

  // Buscar a mensagem mais antiga do ticket no banco para usar como cursor
  const oldestMessage = await Message.findOne({
    where: { ticketId: ticket.id, companyId },
    order: [["createdAt", "ASC"]],
    attributes: ["wid", "createdAt", "fromMe"]
  });

  let oldestMsgKey: any;
  let oldestMsgTimestamp: number;

  if (oldestMessage && oldestMessage.wid) {
    const parsedTime = new Date(oldestMessage.createdAt).getTime();
    oldestMsgTimestamp = !isNaN(parsedTime) ? Math.floor(parsedTime / 1000) : Math.floor(Date.now() / 1000);
    oldestMsgKey = {
      remoteJid: jid,
      id: oldestMessage.wid,
      fromMe: oldestMessage.fromMe
    };
  } else {
    oldestMsgKey = {
      remoteJid: jid,
      id: "",
      fromMe: false
    };
    oldestMsgTimestamp = Math.floor(Date.now() / 1000);
  }

  try {
    const messageId = await wbot.fetchMessageHistory(
      count,
      oldestMsgKey,
      oldestMsgTimestamp
    );

    logger.info(`[FetchMessageHistory] Solicitação de sync enviada para ticket ${ticket.id}, messageId: ${messageId}`);

    return { requested: true, messageId };
  } catch (err: any) {
    logger.error(`[FetchMessageHistory] Erro ao buscar histórico: ${err.message}`);
    throw new Error("ERR_FETCH_HISTORY_FAILED");
  }
};

export default FetchMessageHistoryService;
