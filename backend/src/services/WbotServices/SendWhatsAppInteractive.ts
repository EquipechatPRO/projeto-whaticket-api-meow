import { WAMessage } from "@whiskeysockets/baileys";
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import CreateMessageService from "../MessageServices/CreateMessageService";
import formatBody from "../../helpers/Mustache";
import logger from "../../utils/logger";
import { normalizeJid } from "../../utils";
import {
  sendInteractiveButtons,
  sendInteractiveList,
  sendInteractiveCTAUrl,
  sendInteractiveCTACall,
  sendInteractiveCTACopy,
  sendInteractivePaymentInfo,
  sendInteractiveReviewAndPay,
  sendInteractiveCarousel,
} from "../../helpers/SendInteractiveMsg";
import SendWhatsAppOficialMessage from "../WhatsAppOficial/SendWhatsAppOficialMessage";
import { IMetaMessageinteractive } from "../../libs/whatsAppOficial/IWhatsAppOficial.interfaces";
import fs from "fs";
import path from "path";
import mime from "mime-types";

interface InteractiveButton {
  displayText: string;
  id: string;
}

interface InteractiveListRow {
  header?: string;
  title: string;
  description?: string;
  id: string;
}

interface InteractiveSection {
  title: string;
  rows: InteractiveListRow[];
}

interface InteractiveRequest {
  ticket: Ticket;
  interactiveType: "button" | "list" | "poll" | "location" | "url" | "call" | "pix" | "offer" | "carousel" | "catalog" | "cobranca";
  bodyText: string;
  footerText?: string;
  headerText?: string;
  headerImage?: string;
  buttons?: InteractiveButton[];
  listButtonText?: string;
  sections?: InteractiveSection[];
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  urlText?: string;
  url?: string;
  callText?: string;
  callNumber?: string;
  pixKey?: string;
  pixName?: string;
  pixCity?: string;
  pixAmount?: number;
  pollQuestion?: string;
  pollOptions?: string[];
  offerTitle?: string;
  offerPrice?: string;
  offerDescription?: string;
  offerImageUrl?: string;
  carouselCards?: {
    title: string;
    body: string;
    imageUrl?: string;
    buttons?: InteractiveButton[];
  }[];
  // Cobrança
  cobrancaNumber?: string;
  cobrancaDescription?: string;
  cobrancaQuantity?: number;
  cobrancaAmount?: number;
  cobrancaMessage?: string;
  cobrancaPaymentUrl?: string;
  cobrancaButtonText?: string;
  cobrancaPdfPath?: string;
}

const SendWhatsAppInteractive = async (request: InteractiveRequest): Promise<any> => {
  const { ticket, interactiveType, bodyText, footerText } = request;

  const contact = await Contact.findByPk(ticket.contactId);
  if (!contact) {
    throw new AppError("Contato do ticket não encontrado");
  }

  // ========== BAILEYS ==========
  if (ticket.channel === "whatsapp") {
    const wbot = await GetTicketWbot(ticket);
    let jid = `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
    jid = normalizeJid(jid);

    const formattedBody = formatBody(bodyText, ticket);
    const formattedFooter = footerText ? formatBody(footerText, ticket) : undefined;
    let sentMsg: WAMessage;
    let mediaType = "interactive";
    let bodyToSave = formattedBody;

    try {
      switch (interactiveType) {
        case "button": {
          const btns = (request.buttons || []).slice(0, 3).map((b, i) => ({
            displayText: b.displayText,
            id: b.id || String(i + 1),
          }));
          sentMsg = await sendInteractiveButtons({
            wbot, jid, bodyText: formattedBody, footerText: formattedFooter, buttons: btns,
          });
          bodyToSave = `${formattedBody}\n\n${btns.map((b, i) => `*[ ${i + 1} ]* - ${b.displayText}`).join("\n")}`;
          break;
        }

        case "list": {
          const secs = (request.sections || []).map(sec => ({
            title: sec.title,
            rows: sec.rows.map(r => ({
              title: r.title,
              description: r.description || "",
              id: r.id,
            })),
          }));
          sentMsg = await sendInteractiveList({
            wbot, jid, bodyText: formattedBody, footerText: formattedFooter,
            buttonText: request.listButtonText || "Selecionar", sections: secs,
          });
          const allRows = secs.flatMap(s => s.rows);
          bodyToSave = `${formattedBody}\n\n${allRows.map((r, i) => `*[ ${i + 1} ]* - ${r.title}`).join("\n")}`;
          break;
        }

        case "url": {
          const urlDisplayText = request.urlText || "Acessar link";
          sentMsg = await sendInteractiveCTAUrl({
            wbot, jid, bodyText: formattedBody, footerText: formattedFooter,
            displayText: urlDisplayText, url: request.url || "",
          });
          bodyToSave = `${formattedBody}\n\n🔗 ${urlDisplayText}: ${request.url}`;
          break;
        }

        case "call": {
          const callDisplayText = request.callText || "Ligar";
          sentMsg = await sendInteractiveCTACall({
            wbot, jid, bodyText: formattedBody, footerText: formattedFooter,
            displayText: callDisplayText, phoneNumber: request.callNumber || "",
          });
          bodyToSave = `${formattedBody}\n\n📞 ${callDisplayText}: ${request.callNumber}`;
          break;
        }

        case "pix": {
          const pixBodyText = `${formattedBody}\n\n💰 *Chave PIX:* ${request.pixKey}\n👤 *Nome:* ${request.pixName || ""}\n🏙️ *Cidade:* ${request.pixCity || ""}\n💵 *Valor:* R$ ${request.pixAmount ? request.pixAmount.toFixed(2) : "A definir"}`;

          sentMsg = await sendInteractivePaymentInfo({
            wbot, jid,
            bodyText: pixBodyText,
            footerText: formattedFooter,
            pixKey: request.pixKey || "",
            pixMerchantName: request.pixName || "Pagamento",
          });
          bodyToSave = pixBodyText;
          break;
        }

        case "location": {
          sentMsg = await (wbot as any).sendMessage(jid, {
            location: {
              degreesLatitude: request.latitude || 0,
              degreesLongitude: request.longitude || 0,
              name: request.locationName || "",
              address: request.locationAddress || "",
            },
          }) as WAMessage;
          mediaType = "location";
          bodyToSave = `📍 ${request.locationName || "Localização"}\n${request.locationAddress || ""}`;
          break;
        }

        case "poll": {
          const pollOpts = (request.pollOptions || []).filter(o => o.trim());
          sentMsg = await (wbot as any).sendMessage(jid, {
            poll: {
              name: request.pollQuestion || formattedBody,
              values: pollOpts,
              selectableCount: 1,
            },
          }) as WAMessage;
          mediaType = "pollCreationMessage";
          bodyToSave = `📊 ${request.pollQuestion || formattedBody}\n${pollOpts.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
          break;
        }

        case "offer": {
          const offerBody = `${request.offerTitle ? `*${request.offerTitle}*\n` : ""}${formattedBody}\n\n💰 *Preço:* ${request.offerPrice || "Consulte"}${request.offerDescription ? `\n📝 ${request.offerDescription}` : ""}`;
          const priceMatch = (request.offerPrice || "").replace(/[^\d,\.]/g, "").replace(",", ".");
          const priceValue = parseFloat(priceMatch) || 0;
          const priceCents = Math.round(priceValue * 100);

          sentMsg = await sendInteractiveReviewAndPay({
            wbot, jid,
            bodyText: offerBody,
            footerText: formattedFooter,
            totalAmountValue: priceCents,
            referenceId: `OFFER_${Date.now()}`,
            items: [{
              retailer_id: "offer_001",
              name: request.offerTitle || "Oferta",
              amount: { value: priceCents, offset: 100 },
              quantity: 1,
            }],
          });
          bodyToSave = offerBody;
          break;
        }

        case "carousel":
        case "catalog": {
          const cards = request.carouselCards || [];
          if (cards.length > 1) {
            // Usar carousel nativo via relay
            sentMsg = await sendInteractiveCarousel({
              wbot, jid,
              cards: cards.map((card) => ({
                bodyText: `*${card.title}*\n${card.body}`,
                buttons: (card.buttons || []).slice(0, 3).map((btn) => ({
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: btn.displayText,
                    id: btn.id || "1",
                  }),
                })),
              })),
            });
          } else if (cards.length === 1) {
            const card = cards[0];
            const cardBody = `*${card.title}*\n${card.body}`;
            const cardBtns = (card.buttons || []).slice(0, 3);
            if (cardBtns.length > 0) {
              sentMsg = await sendInteractiveButtons({
                wbot, jid, bodyText: cardBody, buttons: cardBtns,
              });
            } else {
              sentMsg = await (wbot as any).sendMessage(jid, { text: cardBody }) as WAMessage;
            }
          } else {
            sentMsg = { key: { id: `carousel_${Date.now()}` } } as WAMessage;
          }
          bodyToSave = cards.map(c => `*${c.title}*\n${c.body}`).join("\n---\n");
          break;
        }

        case "cobranca": {
          const cNum = request.cobrancaNumber || "";
          const cDesc = request.cobrancaDescription || "";
          const cQty = request.cobrancaQuantity || 1;
          const cAmount = request.cobrancaAmount || 0;
          const cMsg = request.cobrancaMessage || formattedBody;
          const cUrl = request.cobrancaPaymentUrl || "";
          const cBtnText = request.cobrancaButtonText || "Revisar e pagar";
          const cAmountCents = Math.round(cAmount * 100);
          const cPdfPath = request.cobrancaPdfPath || "";

          const cobrancaBody = `*Nº DA COBRANÇA:* ${cNum}\n\n${cDesc}\nQuantidade: ${cQty}\n\n*Total*          *BRL ${cAmount.toFixed(2).replace(".", ",")}*\n\n${cMsg}`;

          // Se tem PDF, envia primeiro como documento
          if (cPdfPath) {
            const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
            const fullPath = path.resolve(publicFolder, cPdfPath);
            if (fs.existsSync(fullPath)) {
              const mimetype = mime.lookup(fullPath) || "application/pdf";
              const fileName = path.basename(fullPath);
              await (wbot as any).sendMessage(jid, {
                document: fs.readFileSync(fullPath),
                mimetype,
                fileName,
                caption: `📄 Boleto/Comprovante - Cobrança ${cNum}`,
              });
            }
          }

          if (cUrl) {
            sentMsg = await sendInteractiveCTAUrl({
              wbot, jid, bodyText: cobrancaBody, footerText: formattedFooter,
              displayText: cBtnText, url: cUrl,
            });
          } else {
            sentMsg = await sendInteractiveReviewAndPay({
              wbot, jid,
              bodyText: cobrancaBody,
              footerText: formattedFooter,
              totalAmountValue: cAmountCents,
              referenceId: cNum || `COB_${Date.now()}`,
              items: [{
                retailer_id: cNum || "cob_001",
                name: cDesc || "Cobrança",
                amount: { value: cAmountCents, offset: 100 },
                quantity: cQty,
              }],
              additionalNote: cMsg,
            });
          }
          bodyToSave = `${cobrancaBody}\n\n🔗 ${cBtnText}${cUrl ? `: ${cUrl}` : ""}`;
          break;
        }

        default:
          throw new AppError(`Tipo interativo '${interactiveType}' não suportado`);
      }

      // Save message
      const messageData = {
        wid: sentMsg?.key?.id || `interactive_${Date.now()}`,
        ticketId: ticket.id,
        contactId: contact.id,
        body: bodyToSave,
        fromMe: true,
        mediaType,
        read: true,
        quotedMsgId: null,
        ack: 2,
        remoteJid: jid,
        participant: null,
        dataJson: null,
        ticketTrakingId: null,
        isPrivate: false,
      };

      await CreateMessageService({ messageData, companyId: ticket.companyId });
      await ticket.update({ lastMessage: bodyToSave, unreadMessages: 0 });

      logger.info(`[INTERACTIVE-TICKET] ${interactiveType} enviado para ${jid} no ticket ${ticket.id}`);
      return sentMsg;

    } catch (err) {
      logger.error(`[INTERACTIVE-TICKET] Erro ao enviar ${interactiveType}: ${err?.message}`);
      Sentry.captureException(err);
      throw new AppError(err?.message || "ERR_SENDING_INTERACTIVE_MSG");
    }
  }

  // ========== API OFICIAL ==========
  if (ticket.channel === "whatsapp_oficial") {
    try {
      switch (interactiveType) {
        case "button": {
          const btns = (request.buttons || []).slice(0, 3);
          const interative: IMetaMessageinteractive = {
            type: "button",
            body: { text: bodyText },
            footer: footerText ? { text: footerText } : undefined,
            action: {
              buttons: btns.map((b, i) => ({
                type: "reply",
                reply: { id: b.id || String(i + 1), title: b.displayText.substring(0, 20) },
              })),
            },
          } as any;
          const bodyToSave = `${bodyText}\n\n${btns.map((b, i) => `*[ ${i + 1} ]* - ${b.displayText}`).join("\n")}`;
          return await SendWhatsAppOficialMessage({
            body: bodyText, ticket, type: "interactive", media: null, interative, bodyToSave,
          });
        }

        case "list": {
          const secs = (request.sections || []).map(sec => ({
            title: sec.title,
            rows: sec.rows.map(r => ({
              id: r.id,
              title: r.title.substring(0, 24),
              description: (r.description || "").substring(0, 72),
            })),
          }));
          const interative: IMetaMessageinteractive = {
            type: "list",
            body: { text: bodyText },
            footer: footerText ? { text: footerText } : undefined,
            action: {
              button: request.listButtonText || "Selecionar",
              sections: secs,
            },
          } as any;
          const allRows = secs.flatMap(s => s.rows);
          const bodyToSave = `${bodyText}\n\n${allRows.map((r, i) => `*[ ${i + 1} ]* - ${r.title}`).join("\n")}`;
          return await SendWhatsAppOficialMessage({
            body: bodyText, ticket, type: "interactive", media: null, interative, bodyToSave,
          });
        }

        case "url": {
          const interative: IMetaMessageinteractive = {
            type: "cta_url",
            body: { text: bodyText },
            footer: footerText ? { text: footerText } : undefined,
            action: {
              name: "cta_url",
              parameters: {
                display_text: request.urlText || "Acessar link",
                url: request.url || "",
              },
            },
          } as any;
          return await SendWhatsAppOficialMessage({
            body: bodyText, ticket, type: "interactive", media: null, interative,
            bodyToSave: `${bodyText}\n\n🔗 ${request.urlText || request.url}\n${request.url}`,
          });
        }

        case "location": {
          const locBody = `📍 *${request.locationName || "Localização"}*\n${request.locationAddress || ""}\nhttps://maps.google.com/?q=${request.latitude},${request.longitude}`;
          return await SendWhatsAppOficialMessage({
            body: locBody, ticket, type: "text", media: null,
          });
        }

        case "cobranca": {
          const cNum = request.cobrancaNumber || "";
          const cDesc = request.cobrancaDescription || "";
          const cQty = request.cobrancaQuantity || 1;
          const cAmount = request.cobrancaAmount || 0;
          const cMsg = request.cobrancaMessage || bodyText;
          const cUrl = request.cobrancaPaymentUrl || "";
          const cBtnText = request.cobrancaButtonText || "Revisar e pagar";

          const cobrancaBody = `*Nº DA COBRANÇA:* ${cNum}\n\n${cDesc}\nQuantidade: ${cQty}\n\n*Total*          *BRL ${cAmount.toFixed(2).replace(".", ",")}*\n\n${cMsg}`;

          if (cUrl) {
            const interative: IMetaMessageinteractive = {
              type: "cta_url",
              body: { text: cobrancaBody },
              footer: footerText ? { text: footerText } : undefined,
              action: {
                name: "cta_url",
                parameters: { display_text: cBtnText, url: cUrl },
              },
            } as any;
            return await SendWhatsAppOficialMessage({
              body: bodyText, ticket, type: "interactive", media: null, interative,
              bodyToSave: `${cobrancaBody}\n\n🔗 ${cBtnText}: ${cUrl}`,
            });
          }
          return await SendWhatsAppOficialMessage({
            body: cobrancaBody, ticket, type: "text", media: null,
          });
        }

        default: {
          let fallbackBody = bodyText;
          if (interactiveType === "call") {
            fallbackBody = `${bodyText}\n\n📞 ${request.callText || "Ligar"}: ${request.callNumber}`;
          } else if (interactiveType === "pix") {
            fallbackBody = `${bodyText}\n\n💰 *Chave PIX:* ${request.pixKey}\n👤 *Nome:* ${request.pixName || ""}\n🏙️ *Cidade:* ${request.pixCity || ""}\n💵 *Valor:* R$ ${request.pixAmount ? request.pixAmount.toFixed(2) : "A definir"}`;
          } else if (interactiveType === "poll") {
            const opts = (request.pollOptions || []).filter(o => o.trim());
            fallbackBody = `📊 *${request.pollQuestion || bodyText}*\n\n${opts.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
          } else if (interactiveType === "offer") {
            fallbackBody = `${request.offerTitle ? `*${request.offerTitle}*\n` : ""}${bodyText}\n\n💰 *Preço:* ${request.offerPrice || "Consulte"}`;
          }
          return await SendWhatsAppOficialMessage({
            body: fallbackBody, ticket, type: "text", media: null,
          });
        }
      }
    } catch (err) {
      logger.error(`[INTERACTIVE-OFICIAL] Erro: ${err?.message}`);
      Sentry.captureException(err);
      throw new AppError(err?.message || "ERR_SENDING_INTERACTIVE_OFICIAL");
    }
  }

  throw new AppError("Canal não suportado para mensagens interativas");
};

export default SendWhatsAppInteractive;
