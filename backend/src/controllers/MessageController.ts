import { Request, Response } from "express";
import AppError from "../errors/AppError";
import fs from "fs";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import { verify } from "jsonwebtoken";
import authConfig from "../config/auth";
import path from "path";
import { isNil, isNull } from "lodash";
import { Mutex } from "async-mutex";
import logger from "../utils/logger";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import CreateMessageService from "../services/MessageServices/CreateMessageService";

import { sendFacebookMessageMedia } from "../services/FacebookServices/sendFacebookMessageMedia";
import { sendFacebookMessage } from "../services/FacebookServices/sendFacebookMessage";

import ShowPlanCompanyService from "../services/CompanyService/ShowPlanCompanyService";
import ListMessagesServiceAll from "../services/MessageServices/ListMessagesServiceAll";
import ShowContactService from "../services/ContactServices/ShowContactService";
import FetchMessageHistoryService from "../services/MessageServices/FetchMessageHistoryService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";

import Contact from "../models/Contact";

import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import ShowMessageService, { GetWhatsAppFromMessage } from "../services/MessageServices/ShowMessageService";
import CompaniesSettings from "../models/CompaniesSettings";
import { verifyMessageFace, verifyMessageMedia } from "../services/FacebookServices/facebookMessageListener";
import EditWhatsAppMessage from "../services/MessageServices/EditWhatsAppMessage";
import SendWhatsAppOficialMessage from "../services/WhatsAppOficial/SendWhatsAppOficialMessage";
import ShowService from "../services/QuickMessageService/ShowService";
import { IMetaMessageTemplateComponents, IMetaMessageTemplate } from "../libs/whatsAppOficial/IWhatsAppOficial.interfaces";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import TranscribeAudioMessageToText from "../services/MessageServices/TranscribeAudioMessageService";

type IndexQuery = {
  pageNumber: string;
  ticketTrakingId: string;
  selectedQueues?: string;
};

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
  number?: string;
  isPrivate?: string;
  vCard?: Contact;
};

type MessageTemplateData = {
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
  number?: string;
  templateId: string;
  variables: string[];
  bodyToSave: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber, selectedQueues: queueIdsStringified } = req.query as IndexQuery;
  const { companyId, profile } = req.user;
  let queues: number[] = [];

  const user = await User.findByPk(req.user.id, {
    include: [{ model: Queue, as: "queues" }]
  });

  const sanitizeQueueIds = (values: unknown): number[] => {
    if (!Array.isArray(values)) return [];
    return values
      .map(value => Number(value))
      .filter(value => Number.isInteger(value) && value > 0);
  };

  if (queueIdsStringified) {
    try {
      queues = sanitizeQueueIds(JSON.parse(queueIdsStringified));
    } catch (error) {
      logger.warn(`[messages.index] selectedQueues inválido: ${queueIdsStringified}`);
      queues = [];
    }
  } else {
    queues = sanitizeQueueIds((user?.queues || []).map(queue => queue.id));
  }

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId,
    companyId,
    queues,
    user
  });

  if (["whatsapp", "whatsapp_oficial"].includes(ticket.channel) && ticket.whatsappId) {
    SetTicketMessagesAsRead(ticket);
  }

  return res.json({ count, messages, ticket, hasMore });
};

export function obterNomeEExtensaoDoArquivo(url: string): string {
  try {
    let filename: string;
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      filename = pathname.split('/').pop() || '';
    } else {
      filename = url.split('/').pop()?.split('\\').pop() || '';
    }
    
    const parts = filename.split('.');
    
    if (parts.length < 2) {
      return filename;
    }

    const nomeDoArquivo = parts[0];
    const extensao = parts[1];

    return `${nomeDoArquivo}.${extensao}`;
  } catch (error) {
    logger.error(`[obterNomeEExtensaoDoArquivo] Erro ao processar: ${url} - ${error}`);
    const filename = url.split('/').pop()?.split('\\').pop();
    return filename || 'arquivo';
  }
}

const isAudioFile = (media: Express.Multer.File): boolean => {
  logger.debug(`[isAudioFile] Verificando: ${media.originalname} (mime: ${media.mimetype}, field: ${media.fieldname})`);

  if (media.fieldname === 'audio') {
    return true;
  }

  if (media.mimetype && media.mimetype.startsWith('audio/')) {
    return true;
  }

  if (media.originalname) {
    const audioExtensions = ['.mp3', '.ogg', '.wav', '.webm', '.m4a', '.aac', '.opus'];
    const extension = path.extname(media.originalname).toLowerCase();
    
    if (audioExtensions.includes(extension)) {
      return true;
    }
  }

  if (media.originalname && 
      (media.originalname.includes('audio_') || 
       media.originalname.includes('áudio') ||
       media.originalname.includes('voice'))) {
    return true;
  }

  return false;
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg, vCard, isPrivate = "false" }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;

  const ticket = await ShowTicketService(ticketId, companyId);

  if (!ticket.whatsappId) {
    throw new AppError("Este ticket não possui conexão vinculada, provavelmente foi excluída a conexão.", 400);
  }

  if (ticket.channel === "whatsapp_oficial" && isPrivate === "false") {
    await ticket.reload({
      include: [{ model: Contact, as: "contact" }]
    });
    
    const lastInteraction = ticket.contact.lastInteractionClient;
    
    logger.info(`[STORE] Validando janela 24h - Ticket ${ticketId} - lastInteraction: ${lastInteraction}, contactId: ${ticket.contact.id}`);
    
    if (!lastInteraction) {
      throw new AppError("Janela de 24h expirada. Envie um template primeiro para iniciar a conversa.", 400);
    }
    
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastInteraction).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    logger.info(`[STORE] Janela 24h - Diferença: ${diffHours.toFixed(2)} horas`);
    
    if (diffHours >= 24) {
      throw new AppError("Janela de 24h expirada. Envie um template primeiro para retomar a conversa.", 400);
    }
  }

  SetTicketMessagesAsRead(ticket);

  try {
    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File, index) => {
          logger.debug(`[STORE] Processando mídia ${index + 1}: ${media.originalname} (mime: ${media.mimetype}, size: ${media.size})`);
          
          if (ticket.channel === "whatsapp") {
            await SendWhatsAppMedia({ 
              media, 
              ticket, 
              body: Array.isArray(body) ? body[index] : body, 
              isPrivate: isPrivate === "true", 
              isForwarded: false 
            });
          }

          if (ticket.channel == 'whatsapp_oficial') {
            await SendWhatsAppOficialMessage({
              media, 
              body: Array.isArray(body) ? body[index] : body, 
              ticket, 
              type: null, 
              quotedMsg
            })
          }

          if (["facebook", "instagram"].includes(ticket.channel)) {
            try {
              const sentMedia = await sendFacebookMessageMedia({
                media,
                ticket,
                body: Array.isArray(body) ? body[index] : body
              });

              if (ticket.channel === "facebook") {
                await verifyMessageMedia(sentMedia, ticket, ticket.contact, true);
              }
            } catch (error) {
              logger.error(`[STORE] Erro ao enviar mídia Facebook/Instagram: ${error}`);
            }
          }
        })
      );
    } else {
      if (ticket.channel === "whatsapp" && isPrivate === "false") {
        await SendWhatsAppMessage({ body, ticket, quotedMsg, vCard });
      } else if (ticket.channel == 'whatsapp_oficial' && isPrivate === "false") {
        await SendWhatsAppOficialMessage({
          body, ticket, quotedMsg, type: !isNil(vCard) ? 'contacts' : 'text', media: null, vCard
        })
      } else if (isPrivate === "true") {
        const messageData = {
          wid: `PVT${ticket.updatedAt.toString().replace(' ', '')}`,
          ticketId: ticket.id,
          contactId: undefined,
          body,
          fromMe: true,
          mediaType: !isNil(vCard) ? 'contactMessage' : 'extendedTextMessage',
          read: true,
          quotedMsgId: null,
          ack: 2,
          remoteJid: ticket.contact?.remoteJid,
          participant: null,
          dataJson: null,
          ticketTrakingId: null,
          isPrivate: isPrivate === "true"
        };

        await CreateMessageService({ messageData, companyId: ticket.companyId });

      } else if (["facebook", "instagram"].includes(ticket.channel) && isPrivate === "false") {
        const sendResult = await sendFacebookMessage({ body, ticket, quotedMsg });

        if (ticket.channel === "facebook") {
          const bodyToSave = sendResult?.processedBody || body;
          await verifyMessageFace({}, bodyToSave, ticket, ticket.contact, true);
        }
      }
    }
    return res.send();
  } catch (error) {
    logger.error(`[STORE] Erro no envio de mensagem: ${error}`);
    return res.status(400).json({ error: error.message });
  }
};

export const forwardMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {

  const { quotedMsg, signMessage, messageId, contactId } = req.body;
  const { id: userId, companyId } = req.user;
  const requestUser = await User.findByPk(userId);

  if (!messageId || !contactId) {
    return res.status(200).send("MessageId or ContactId not found");
  }
  const message = await ShowMessageService(messageId);
  const contact = await ShowContactService(contactId, companyId);

  if (!message) {
    return res.status(404).send("Message not found");
  }
  if (!contact) {
    return res.status(404).send("Contact not found");
  }

  const settings = await CompaniesSettings.findOne({
    where: { companyId }
  }
  )

  const whatsAppConnectionId = await GetWhatsAppFromMessage(message);
  if (!whatsAppConnectionId) {
    return res.status(404).send('Whatsapp from message not found');
  }

  const ticket = await ShowTicketService(message.ticketId, message.companyId);

  const mutex = new Mutex();

  const createTicket = await mutex.runExclusive(async () => {
    const result = await FindOrCreateTicketService(
      contact,
      ticket?.whatsapp,
      0,
      ticket.companyId,
      ticket.queueId,
      requestUser.id,
      contact.isGroup ? contact : null,
      ticket.channel,
      null,
      true,
      settings,
      false,
      false
    );
    return result;
  });

  let ticketData;

  if (isNil(createTicket?.queueId)) {
    ticketData = {
      status: createTicket.isGroup ? "group" : "open",
      userId: requestUser.id,
      queueId: ticket.queueId
    }
  } else {
    ticketData = {
      status: createTicket.isGroup ? "group" : "open",
      userId: requestUser.id
    }
  }

  await UpdateTicketService({
    ticketData,
    ticketId: createTicket.id,
    companyId: createTicket.companyId
  });

  let body = message.body;
  if (message.mediaType === 'conversation'
    || message.mediaType === 'extendedTextMessage'
    || message.mediaType === 'text'
    || message.mediaType === 'location'
    || message.mediaType === 'contactMessage'
    || message.mediaType === 'interactive') {
    if (ticket.channel === "whatsapp") {
      await SendWhatsAppMessage({ body, ticket: createTicket, quotedMsg, isForwarded: message.fromMe ? false : true });
    }
    if (ticket.channel === "whatsapp_oficial") {
      await SendWhatsAppOficialMessage({ body: `_Mensagem encaminhada_:\n ${body}`, ticket: createTicket, quotedMsg, type: 'text', media: null });
    }
  } else {

    const mediaUrl = message.mediaUrl.replace(`:${process.env.PORT}`, '');
    const fileName = obterNomeEExtensaoDoArquivo(mediaUrl);

    if (body === fileName) {
      body = "";
    }

    const publicFolder = path.join(__dirname, '..', '..', '..', 'backend', 'public');

    const filePath = path.join(publicFolder, `company${createTicket.companyId}`, fileName)

    const mediaSrc = {
      fieldname: 'medias',
      originalname: fileName,
      encoding: '7bit',
      mimetype: message.mediaType,
      filename: fileName,
      path: filePath
    } as Express.Multer.File

    if (ticket.channel === "whatsapp") {
      await SendWhatsAppMedia({ media: mediaSrc, ticket: createTicket, body, isForwarded: message.fromMe ? false : true });
    }
    if (ticket.channel === "whatsapp_oficial") {
      await SendWhatsAppOficialMessage({ body: `_Mensagem encaminhada_:\n ${body}`, ticket: createTicket, quotedMsg, type: null, media: mediaSrc });
    }
  }

  return res.send();
}

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;

  const message = await DeleteWhatsAppMessage(messageId, companyId);
  const io = getIO();

  if (message.isPrivate) {
    await Message.destroy({
      where: {
        id: message.id
      }
    });
    io.of(String(companyId))
      .emit(`company-${companyId}-appMessage`, {
        action: "delete",
        message
      });
  }

  io.of(String(companyId))
    .emit(`company-${companyId}-appMessage`, {
      action: "update",
      message
    });

  return res.send();
};

export const allMe = async (req: Request, res: Response): Promise<Response> => {

  const dateStart: any = req.query.dateStart;
  const dateEnd: any = req.query.dateEnd;
  const fromMe: any = req.query.fromMe;

  const { companyId } = req.user;

  const { count } = await ListMessagesServiceAll({
    companyId,
    fromMe,
    dateStart,
    dateEnd
  });

  return res.json({ count });
};

export const send = async (req: Request, res: Response): Promise<Response> => {
  const messageData: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  try {

    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");

    const whatsapp = await Whatsapp.findOne({ where: { token } });
    if (!whatsapp) {
      return res.status(401).json({ error: "Token inválido ou WhatsApp não encontrado" });
    }
    const companyId = whatsapp.companyId;
    const company = await ShowPlanCompanyService(companyId);
    const sendMessageWithExternalApi = company?.plan?.useExternalApi

    if (sendMessageWithExternalApi) {

      if (!whatsapp) {
        throw new Error("Não foi possível realizar a operação");
      }

      if (messageData.number === undefined) {
        throw new Error("O número é obrigatório");
      }

      const number = messageData.number;
      const body = messageData.body;

      if (medias) {
        await Promise.all(
          medias.map(async (media: Express.Multer.File) => {
            req.app.get("queues").messageQueue.add(
              "SendMessage",
              {
                whatsappId: whatsapp.id,
                data: {
                  number,
                  body: media.originalname.replace('/', '-'),
                  mediaPath: media.path
                }
              },
              { removeOnComplete: true, attempts: 3 }
            );
          })
        );
      } else {
        req.app.get("queues").messageQueue.add(
          "SendMessage",
          {
            whatsappId: whatsapp.id,
            data: {
              number,
              body
            }
          },
          { removeOnComplete: true, attempts: 3 }
        );
      }
      return res.send({ mensagem: "Mensagem enviada!" });
    }
    return res.status(400).json({ error: 'Essa empresa não tem permissão para usar a API Externa. Entre em contato com o Suporte para verificar nossos planos!' });

  } catch (err: any) {
    logger.error(`[SEND] Erro ao enviar mensagem: ${err.message || err}`);
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};

export const edit = async (req: Request, res: Response): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;
  const { body }: MessageData = req.body;

  const { ticket, message } = await EditWhatsAppMessage({ messageId, body });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-appMessage`, {
      action: "update",
      message
    });

  io.of(String(companyId))
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
  return res.send();
}

export const storeTemplate = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;

  const { quotedMsg, templateId, variables, bodyToSave }: MessageTemplateData = req.body;
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;

  const ticket = await ShowTicketService(ticketId, companyId);

  const template = await ShowService(templateId, companyId);

  if (!template) {
    throw new Error("Template not found");
  }
  let templateData: IMetaMessageTemplate = {
    name: template.shortcode,
    language: {
      code: template.language
    }
  }
  let buttonsToSave = []
  if (Object.keys(variables).length > 0) {
    templateData = {
      name: template.shortcode,
      language: {
        code: template.language
      },
    };

    if (Array.isArray(template.components) && template.components.length > 0) {
      template.components.forEach((component, index) => {
        const componentType = component.type.toLowerCase() as "header" | "body" | "footer" | "button";
        if (variables[componentType] && Object.keys(variables[componentType]).length > 0) {
          let newComponent

          if (componentType.replace("buttons", "button") === "button") {
            const buttons = JSON.parse(component.buttons)
            buttons.forEach((button, index) => {
              const subButton = Object.values(variables[componentType])
              subButton.forEach((sub, indexSub) => {
                if ((sub as any).buttonIndex === index) {
                  const buttonType = button.type;
                  newComponent =
                  {
                    type: componentType.replace("buttons", "button"),
                    sub_type: buttonType,
                    index: index,
                    parameters: []
                  };
                }
              })
            })
          }
          else {
            newComponent = {
              type: componentType,
              parameters: []
            };
          }

          if (newComponent) {
            Object.keys(variables[componentType]).forEach(key => {
              if (componentType.replace("buttons", "button") === "button") {
                if ((newComponent as any)?.sub_type === "COPY_CODE") {
                  newComponent.parameters.push({
                    type: "coupon_code",
                    coupon_code: variables[componentType][key].value
                  })

                } else {
                  newComponent.parameters.push({
                    type: "text",
                    text: variables[componentType][key].value
                  })
                }

              }
              else {
                if (template.components[index].format === 'IMAGE') {
                  newComponent.parameters.push({
                    type: "image",
                    image: {
                      link: variables[componentType][key].value
                    }
                  })
                }
                else {
                  const variableValue = variables[componentType][key].value;
                  newComponent.parameters.push({
                    type: "text",
                    text: variableValue
                  });
                }
              }
            });
          }
          if (!Array.isArray(templateData.components)) {
            templateData.components = [];
          }
          templateData.components.push(newComponent as IMetaMessageTemplateComponents);
        }
      });
    }
  }

  if (template.components.length > 0) {
    for (const component of template.components) {
      if (component.type === 'BUTTONS') {
        buttonsToSave.push(component.buttons)
      }
    }
  }
  logger.debug(`[STORE_TEMPLATE] templateData: ${JSON.stringify(templateData)}`);
  const newBodyToSave = bodyToSave.concat('||||', JSON.stringify(buttonsToSave))
  if (["whatsapp_oficial"].includes(ticket.channel) && ticket.whatsappId) {
    SetTicketMessagesAsRead(ticket);
  }

  try {

    if (ticket.channel == 'whatsapp_oficial') {
      await SendWhatsAppOficialMessage({
        body: newBodyToSave, ticket, quotedMsg, type: 'template', media: null, template: templateData
      })
      
      const contact = await ticket.reload({
        include: [{ model: Contact, as: "contact" }]
      });
      await ticket.contact.update({
        lastInteractionClient: new Date()
      });
      logger.info(`[STORE_TEMPLATE] Template enviado - Janela de 24h aberta para o contato ${ticket.contact.id}`);
    }

    return res.send(200);
  } catch (error) {
    logger.error(`[STORE_TEMPLATE] Erro ao enviar template: ${error.message}`);
    return res.status(400).json({ error: error.message });
  }
};

export const sendMessageFlow = async (
  whatsappId: number,
  body: any,
  req: Request,
  files?: Express.Multer.File[]
): Promise<String> => {
  const messageData = body;
  const medias = files;

  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new Error("Não foi possível realizar a operação");
    }

    if (messageData.number === undefined) {
      throw new Error("O número é obrigatório");
    }

    const numberToTest = messageData.number;
    const body = messageData.body;

    const companyId = messageData.companyId;

    const CheckValidNumber: any = await CheckContactNumber(numberToTest, companyId);
    const number = CheckValidNumber.jid.split("@")[0];

    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          await req.app.get("queues").messageQueue.add(
            "SendMessage",
            {
              whatsappId,
              data: {
                number,
                body: media.originalname,
                mediaPath: media.path
              }
            },
            { removeOnComplete: true, attempts: 3 }
          );
        })
      );
    } else {
      req.app.get("queues").messageQueue.add(
        "SendMessage",
        {
          whatsappId,
          data: {
            number,
            body
          }
        },

        { removeOnComplete: false, attempts: 3 }
      );
    }

    return "Mensagem enviada";
  } catch (err: any) {
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};

export const transcribeAudioMessage = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { wid } = req.body;

  const transcribedText = await TranscribeAudioMessageToText(wid, companyId.toString());

  return res.send(transcribedText);
};

export const storeInteractive = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;
  const {
    interactiveType,
    bodyText,
    footerText,
    headerText,
    headerImage,
    buttons,
    listButtonText,
    sections,
    latitude,
    longitude,
    locationName,
    locationAddress,
    urlText,
    url,
    callText,
    callNumber,
    pixKey,
    pixName,
    pixCity,
    pixAmount,
    pollQuestion,
    pollOptions,
    offerTitle,
    offerPrice,
    offerDescription,
    offerImageUrl,
    carouselCards,
    cobrancaNumber,
    cobrancaDescription,
    cobrancaQuantity,
    cobrancaAmount,
    cobrancaMessage,
    cobrancaPaymentUrl,
    cobrancaButtonText,
    cobrancaPdfPath,
  } = req.body;

  const ticket = await ShowTicketService(ticketId, companyId);

  if (!ticket.whatsappId) {
    throw new AppError("Este ticket não possui conexão vinculada.", 400);
  }

  SetTicketMessagesAsRead(ticket);

  try {
    const SendWhatsAppInteractive = (await import("../services/WbotServices/SendWhatsAppInteractive")).default;

    const result = await SendWhatsAppInteractive({
      ticket,
      interactiveType,
      bodyText: bodyText || "",
      footerText,
      headerText,
      headerImage,
      buttons,
      listButtonText,
      sections,
      latitude,
      longitude,
      locationName,
      locationAddress,
      urlText,
      url,
      callText,
      callNumber,
      pixKey,
      pixName,
      pixCity,
      pixAmount,
      pollQuestion,
      pollOptions,
      offerTitle,
      offerPrice,
      offerDescription,
      offerImageUrl,
      carouselCards,
      cobrancaNumber,
      cobrancaDescription,
      cobrancaQuantity: cobrancaQuantity ? parseInt(cobrancaQuantity) : undefined,
      cobrancaAmount: cobrancaAmount ? parseFloat(cobrancaAmount) : undefined,
      cobrancaMessage,
      cobrancaPaymentUrl,
      cobrancaButtonText,
      cobrancaPdfPath,
    });

    return res.json({ message: "Mensagem interativa enviada com sucesso", result });
  } catch (error) {
    logger.error(`[storeInteractive] Erro: ${error?.message}`);
    return res.status(400).json({ error: error?.message || "Erro ao enviar mensagem interativa" });
  }
};

export const fetchHistory = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { count } = req.body;
  const { companyId } = req.user;

  const parsedCompanyId = Number(companyId);
  const ticketParam = String(ticketId || "").trim();
  const parsedTicketId = Number(ticketParam);
  const parsedCount = Math.min(200, Math.max(1, Number(count) || 50));

  if (isNaN(parsedCompanyId)) {
    logger.warn(`[fetchHistory] companyId inválido: ${companyId}`);
    return res.status(400).json({ error: "companyId inválido" });
  }

  if (!ticketParam || ticketParam === "undefined" || ticketParam === "null") {
    logger.warn(`[fetchHistory] ticketId inválido: ${ticketId}`);
    return res.status(400).json({ error: "ticketId inválido" });
  }

  try {
    const result = await FetchMessageHistoryService({
      ticketId: Number.isFinite(parsedTicketId) ? parsedTicketId : undefined,
      ticketUuid: Number.isFinite(parsedTicketId) ? undefined : ticketParam,
      companyId: parsedCompanyId,
      count: parsedCount
    });

    return res.json(result);
  } catch (error: any) {
    logger.error(`[fetchHistory] Erro: ${error?.message}`);
    return res.status(400).json({ error: error?.message || "Erro ao buscar histórico" });
  }
};
