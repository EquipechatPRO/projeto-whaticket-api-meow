import fs from "fs";
import path from "path";
import * as Sentry from "@sentry/node";
import {
  extractMessageContent,
  getContentType,
  proto,
  WAMessage,
  WAMessageStubType
} from "@whiskeysockets/baileys";
import logger from "../../utils/logger";
import OpenAI from "openai";

// ===== Interfaces =====
export interface IMe {
  name: string;
  id: string;
  lid?: string;
  senderPn?: string;
  notify?: string;
  verifiedName?: string;
}

export interface PhraseCondition {
  text: string;
  type: "exact" | "partial";
}

export interface CampaignPhrase {
  id: number;
  flowId: number;
  phrase: PhraseCondition[];
  whatsappId: number;
  status: boolean;
  companyId: number;
}

export interface SessionOpenAi extends OpenAI {
  id?: number;
}

// ===== Utility Functions =====

export function removeFile(directory: string) {
  fs.unlink(directory, error => {
    if (error) throw error;
  });
}

export const getTimestampMessage = (msgTimestamp: any) => {
  return msgTimestamp * 1;
};

const multVecardGet = function (param: any) {
  let output = " ";
  let name = param
    .split("\n")[2]
    .replace(";;;", "\n")
    .replace("N:", "")
    .replace(";", "")
    .replace(";", " ")
    .replace(";;", " ")
    .replace("\n", "");
  let inicio = param.split("\n")[4].indexOf("=");
  let fim = param.split("\n")[4].indexOf(":");
  let contact = param
    .split("\n")[4]
    .substring(inicio + 1, fim)
    .replace(";", "");
  let contactSemWhats = param.split("\n")[4].replace("item1.TEL:", "");
  if (contact != "item1.TEL") {
    output = output + name + ": 📞" + contact + "" + "\n";
  } else output = output + name + ": 📞" + contactSemWhats + "" + "\n";
  return output;
};

const contactsArrayMessageGet = (msg: any) => {
  let contactsArray = msg.message?.contactsArrayMessage?.contacts;
  let vcardMulti = contactsArray.map(function (item: any) {
    return item.vcard;
  });

  let bodymessage = ``;
  vcardMulti.forEach(function (vcard: any) {
    bodymessage += vcard + "\n\n" + "";
  });

  let contacts = bodymessage.split("BEGIN:");
  contacts.shift();
  let finalContacts = "";
  for (let contact of contacts) {
    finalContacts = finalContacts + multVecardGet(contact);
  }
  return finalContacts;
};

export const getTypeMessage = (msg: proto.IWebMessageInfo): string => {
  const msgType = getContentType(msg.message);
  if (msg.message?.extendedTextMessage?.contextInfo?.externalAdReply) {
    return 'adMetaPreview';
  }
  if (msg.message?.viewOnceMessageV2) {
    return "viewOnceMessageV2";
  }
  if ((msg.message as any)?.interactiveResponseMessage) {
    return "interactiveResponseMessage";
  }
  return msgType as string;
};

const getAd = (msg: any): string => {
  if (
    msg.key.fromMe &&
    msg.message?.listResponseMessage?.contextInfo?.externalAdReply
  ) {
    let bodyMessage = `*${msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.title}*`;
    bodyMessage += `\n\n${msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.body}`;
    return bodyMessage;
  }
};

const getBodyButton = (msg: any): string => {
  try {
    if (
      msg?.messageType === "buttonsMessage" ||
      msg?.message?.buttonsMessage?.contentText
    ) {
      let bodyMessage = `[BUTTON]\n\n*${msg?.message?.buttonsMessage?.contentText}*\n\n`;
      for (const button of msg.message?.buttonsMessage?.buttons) {
        bodyMessage += `*${button.buttonId}* - ${button.buttonText.displayText}\n`;
      }
      return bodyMessage;
    }
    if (
      msg?.messageType === "listMessage" ||
      msg?.message?.listMessage?.description
    ) {
      let bodyMessage = `[LIST]\n\n*${msg?.message?.listMessage?.description}*\n\n`;
      for (const button of msg.message?.listMessage?.sections[0]?.rows) {
        bodyMessage += `${button.title}\n`;
      }
      return bodyMessage;
    }
  } catch (error) {
    logger.error(error);
  }
};

export const msgLocation = (image: any, latitude: any, longitude: any) => {
  if (image) {
    var b64 = Buffer.from(image).toString("base64");
    let data = `data:image/png;base64, ${b64} | https://maps.google.com/maps?q=${latitude}%2C${longitude}&z=17&hl=pt-BR|${latitude}, ${longitude} `;
    return data;
  }
};

const msgAdMetaPreview = (image: any, title: any, body: any, sourceUrl: any, messageUser: any) => {
  if (image) {
    var b64 = Buffer.from(image).toString("base64");
    let data = `data:image/png;base64, ${b64} | ${sourceUrl} | ${title} | ${body} | ${messageUser}`;
    return data;
  }
};

export const getBodyMessage = (msg: proto.IWebMessageInfo): string | null => {
  try {
    let type = getTypeMessage(msg);
    if (type === undefined) console.log(JSON.stringify(msg));

    const types: any = {
      conversation: msg.message?.conversation,
      imageMessage: msg.message?.imageMessage?.caption,
      videoMessage: msg.message?.videoMessage?.caption,
      extendedTextMessage: msg?.message?.extendedTextMessage?.text,
      buttonsResponseMessage: msg.message?.buttonsResponseMessage?.selectedDisplayText,
      listResponseMessage:
        msg.message?.listResponseMessage?.title ||
        msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
      templateButtonReplyMessage: msg.message?.templateButtonReplyMessage?.selectedId,
      messageContextInfo:
        msg.message?.buttonsResponseMessage?.selectedButtonId ||
        msg.message?.listResponseMessage?.title,
      buttonsMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.title,
      stickerMessage: "sticker",
      contactMessage: msg.message?.contactMessage?.vcard,
      contactsArrayMessage:
        msg.message?.contactsArrayMessage?.contacts && contactsArrayMessageGet(msg),
      locationMessage: msgLocation(
        msg.message?.locationMessage?.jpegThumbnail,
        msg.message?.locationMessage?.degreesLatitude,
        msg.message?.locationMessage?.degreesLongitude
      ),
      liveLocationMessage: `Latitude: ${msg.message?.liveLocationMessage?.degreesLatitude} - Longitude: ${msg.message?.liveLocationMessage?.degreesLongitude}`,
      documentMessage: msg.message?.documentMessage?.caption,
      audioMessage: "Áudio",
      listMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.title,
      viewOnceMessage: getBodyButton(msg),
      reactionMessage: msg.message?.reactionMessage?.text || "reaction",
      senderKeyDistributionMessage:
        msg?.message?.senderKeyDistributionMessage?.axolotlSenderKeyDistributionMessage,
      documentWithCaptionMessage:
        msg.message?.documentWithCaptionMessage?.message?.documentMessage?.caption,
      viewOnceMessageV2: msg.message?.viewOnceMessageV2?.message?.imageMessage?.caption,
      adMetaPreview: msgAdMetaPreview(
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.thumbnail,
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.title,
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.body,
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.sourceUrl,
        msg.message?.extendedTextMessage?.text
      ),
      editedMessage:
        msg?.message?.protocolMessage?.editedMessage?.conversation ||
        msg?.message?.editedMessage?.message?.protocolMessage?.editedMessage?.conversation,
      ephemeralMessage: msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text,
      imageWhitCaptionMessage: msg?.message?.ephemeralMessage?.message?.imageMessage,
      highlyStructuredMessage: msg.message?.highlyStructuredMessage,
      protocolMessage: msg?.message?.protocolMessage?.editedMessage?.conversation,
      advertising:
        getAd(msg) ||
        msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.title,
      interactiveResponseMessage: (() => {
        try {
          const irm = (msg.message as any)?.interactiveResponseMessage;
          if (irm?.nativeFlowResponseMessage?.paramsJson) {
            const params = JSON.parse(irm.nativeFlowResponseMessage.paramsJson);
            return params?.id || params?.display_text || irm?.body?.text || "";
          }
          return irm?.body?.text || "";
        } catch { return ""; }
      })()
    };

    const objKey = Object.keys(types).find(key => key === type);
    if (!objKey) {
      logger.warn(`#### Nao achou o type 152: ${type} ${JSON.stringify(msg.message)}`);
      Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, type });
      Sentry.captureException(new Error("Novo Tipo de Mensagem em getTypeMessage"));
    }
    return types[type];
  } catch (error) {
    Sentry.setExtra("Error getTypeMessage", { msg, BodyMsg: msg?.message });
    Sentry.captureException(error);
    console.log(error);
  }
};

export const getQuotedMessage = (msg: proto.IWebMessageInfo) => {
  const body = extractMessageContent(msg.message)[
    Object.keys(msg?.message).values().next().value
  ];
  if (!body?.contextInfo?.quotedMessage) return;
  const quoted = extractMessageContent(
    body?.contextInfo?.quotedMessage[
      Object.keys(body?.contextInfo?.quotedMessage).values().next().value
    ]
  );
  return quoted;
};

export const getQuotedMessageId = (msg: proto.IWebMessageInfo) => {
  const body = extractMessageContent(msg.message)[
    Object.keys(msg?.message).values().next().value
  ];
  let reaction = msg?.message?.reactionMessage
    ? msg?.message?.reactionMessage?.key?.id
    : "";
  return reaction ? reaction : body?.contextInfo?.stanzaId;
};

export const isValidMsg = (msg: proto.IWebMessageInfo): boolean => {
  if (msg.key.remoteJid === "status@broadcast") return false;
  try {
    const msgType = getTypeMessage(msg);
    if (!msgType) return;

    const ifType =
      msgType === "conversation" ||
      msgType === "extendedTextMessage" ||
      msgType === "audioMessage" ||
      msgType === "videoMessage" ||
      msgType === "ptvMessage" ||
      msgType === "imageMessage" ||
      msgType === "documentMessage" ||
      msgType === "stickerMessage" ||
      msgType === "buttonsResponseMessage" ||
      msgType === "buttonsMessage" ||
      msgType === "messageContextInfo" ||
      msgType === "locationMessage" ||
      msgType === "liveLocationMessage" ||
      msgType === "contactMessage" ||
      msgType === "voiceMessage" ||
      msgType === "mediaMessage" ||
      msgType === "contactsArrayMessage" ||
      msgType === "reactionMessage" ||
      msgType === "ephemeralMessage" ||
      msgType === "protocolMessage" ||
      msgType === "listResponseMessage" ||
      msgType === "listMessage" ||
      msgType === "interactiveMessage" ||
      msgType === "pollCreationMessageV3" ||
      msgType === "viewOnceMessage" ||
      msgType === "documentWithCaptionMessage" ||
      msgType === "viewOnceMessageV2" ||
      msgType === "editedMessage" ||
      msgType === "advertisingMessage" ||
      msgType === "highlyStructuredMessage" ||
      msgType === "eventMessage" ||
      msgType === "adMetaPreview" ||
      msgType === "interactiveResponseMessage" ||
      msgType === "pollUpdateMessage" ||
      msgType === "pollCreationMessage";

    if (!ifType) {
      logger.warn(`#### Nao achou o type em isValidMsg: ${msgType}\n${JSON.stringify(msg?.message)}`);
      Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, msgType });
      Sentry.captureException(new Error("Novo Tipo de Mensagem em isValidMsg"));
    }
    return !!ifType;
  } catch (error) {
    Sentry.setExtra("Error isValidMsg", { msg });
    Sentry.captureException(error);
  }
};

export function findCaption(obj: any): string | null {
  if (typeof obj !== "object" || obj === null) return null;
  for (const key in obj) {
    if (key === "caption" || key === "text" || key === "conversation") return obj[key];
    const result = findCaption(obj[key]);
    if (result) return result;
  }
  return null;
}

export const getMediaTypeFromMimeType = (mimetype: string): string => {
  const documentMimeTypes = [
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.oasis.opendocument.graphics",
    "application/rtf", "text/plain", "text/csv", "text/html", "text/xml",
    "application/xml", "application/json", "application/ofx",
    "application/vnd.ms-outlook", "application/vnd.apple.keynote",
    "application/vnd.apple.numbers", "application/vnd.apple.pages"
  ];
  const archiveMimeTypes = [
    "application/zip", "application/x-rar-compressed",
    "application/x-7z-compressed", "application/x-tar",
    "application/gzip", "application/x-bzip2"
  ];
  if (documentMimeTypes.includes(mimetype)) return "document";
  if (archiveMimeTypes.includes(mimetype)) return "document";
  return mimetype.split("/")[0];
};

export const sanitizeName = (name: string): string => {
  let sanitized = name.split(" ")[0];
  sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
  return sanitized.substring(0, 60);
};

export const formatDateTimeBrasilia = (date: Date): string => {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const partValue = (type: string) => parts.find(part => part.type === type)?.value || "";
  return `${partValue("weekday")}, ${partValue("day")}/${partValue("month")}/${partValue("year")} ${partValue("hour")}:${partValue("minute")}:${partValue("second")}`;
};

export const deleteFileSync = (path: string): void => {
  try { fs.unlinkSync(path); } catch (error) { console.error("Erro ao deletar o arquivo:", error); }
};

export const keepOnlySpecifiedChars = (str: string) => {
  return str.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôûÂÊÎÔÛãõÃÕçÇ!?.,;:\s]/g, "");
};

export const filterMessages = (msg: WAMessage): boolean => {
  if (msg.message?.protocolMessage?.editedMessage) return true;
  if (msg.message?.protocolMessage) return false;
  if (
    [
      WAMessageStubType.REVOKE,
      WAMessageStubType.E2E_DEVICE_CHANGED,
      WAMessageStubType.E2E_IDENTITY_CHANGED,
      WAMessageStubType.CIPHERTEXT
    ].includes(msg.messageStubType)
  ) return false;
  return true;
};

export const allowedMimeTypes = [
  "text/plain", "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/postscript", "application/x-zip-compressed",
  "application/zip", "application/octet-stream",
  "application/x-mtx", "application/x-aud", "application/x-rul",
  "application/x-exp", "application/x-plt", "application/x-mdl",
  "image/vnd.adobe.photoshop", "application/x-photoshop",
  "image/x-photoshop", "application/vnd.corel-draw",
  "application/illustrator",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-word.document.macroEnabled.12",
  "application/x-msdownload", "application/x-executable",
  "application/x-ret"
];

// ===== Campaign Matching Utilities =====

export const matchesAnyPhrase = (
  campaignPhrases: PhraseCondition[],
  messageBody: string
): boolean => {
  if (!campaignPhrases || !Array.isArray(campaignPhrases) || campaignPhrases.length === 0) return false;
  if (!messageBody || typeof messageBody !== "string") return false;
  const bodyLower = messageBody.toLowerCase().trim();
  return campaignPhrases.some((condition: PhraseCondition) => {
    if (!condition.text || typeof condition.text !== "string") return false;
    const phraseLower = condition.text.toLowerCase().trim();
    if (condition.type === "exact") return bodyLower === phraseLower;
    if (condition.type === "partial") return bodyLower.includes(phraseLower);
    return false;
  });
};

export const normalizeCampaignPhrases = (phrase: any): PhraseCondition[] => {
  if (!phrase) return [];
  if (Array.isArray(phrase)) return phrase.filter(item => item && item.text);
  if (typeof phrase === "string") {
    try {
      const parsed = JSON.parse(phrase);
      if (Array.isArray(parsed)) return parsed.filter(item => item && item.text);
      if (typeof parsed === "string") return [{ text: parsed, type: "exact" }];
    } catch { return [{ text: phrase, type: "exact" }]; }
  }
  return [];
};

export const findMatchingCampaign = (
  campaigns: CampaignPhrase[],
  messageBody: string
): CampaignPhrase | null => {
  if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) return null;
  if (!messageBody || typeof messageBody !== "string") return null;
  return campaigns.find((campaign: CampaignPhrase) => {
    if (!campaign.status) return false;
    const phrases = normalizeCampaignPhrases(campaign.phrase);
    const hasMatch = matchesAnyPhrase(phrases, messageBody);
    if (hasMatch) {
      console.log(`[CAMPANHA MATCH] ID: ${campaign.id}, Mensagem: "${messageBody}", Frases:`, phrases);
    }
    return hasMatch;
  }) || null;
};

export const transferQueue = async (
  queueId: number,
  ticket: any,
  contact: any
): Promise<void> => {
  const UpdateTicketService = (await import("../TicketServices/UpdateTicketService")).default;
  await UpdateTicketService({
    ticketData: { queueId },
    ticketId: ticket.id,
    companyId: ticket.companyId
  });
};
