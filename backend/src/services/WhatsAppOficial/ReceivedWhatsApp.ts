import path from "path";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import Contact from "../../models/Contact";
import moment from "moment";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "fs";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CompaniesSettings from "../../models/CompaniesSettings";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import verifyMessageOficial from "./VerifyMessageOficial";
import verifyQueueOficial from "./VerifyQueue";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import Queue from "../../models/Queue";
import Ticket from "../../models/Ticket";
import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import { handleMessageIntegration } from "../WbotServices/wbotMessageListener";
import { flowbuilderIntegration } from "../WbotServices/wbotMessageListener";
import ShowContactService from "../ContactServices/ShowContactService";
import { WebhookModel } from "../../models/Webhook";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import { FlowCampaignModel } from "../../models/FlowCampaign";
import ContactTag from "../../models/ContactTag";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import cacheLayer from "../../libs/cache";
import { isNil } from "lodash";
import VerifyCurrentSchedule from "../CompanyService/VerifyCurrentSchedule";
import SendWhatsAppOficialMessage from "./SendWhatsAppOficialMessage";
import typebotListenerOficial from "../TypebotServices/typebotListenerOficial";
import UserRating from "../../models/UserRating";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";

const mimeToExtension: { [key: string]: string } = {
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'oga',
    'audio/opus': 'opus',
    'audio/wav': 'wav',
    'audio/webm': 'weba',
    'audio/3gpp': '3gp',
    'audio/3gpp2': '3g2',
    'audio/x-wav': 'wav',
    'audio/midi': 'midi',
    'application/x-abiword': 'abw',
    'application/octet-stream': 'arc',
    'video/x-msvideo': 'avi',
    'application/vnd.amazon.ebook': 'azw',
    'application/x-bzip': 'bz',
    'application/x-bzip2': 'bz2',
    'application/x-csh': 'csh',
    'text/css': 'css',
    'text/csv': 'csv',
    'text/plain': 'txt',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-fontobject': 'eot',
    'application/epub+zip': 'epub',
    'image/gif': 'gif',
    'text/html': 'html',
    'image/x-icon': 'ico',
    'text/calendar': 'ics',
    'image/jpeg': 'jpg',
    'application/json': 'json',
    'video/mpeg': 'mpeg',
    'application/vnd.apple.installer+xml': 'mpkg',
    'video/ogg': 'ogv',
    'application/ogg': 'ogx',
    'font/otf': 'otf',
    'image/png': 'png',
    'application/pdf': 'pdf',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/x-rar-compressed': 'rar',
    'application/rtf': 'rtf',
    'application/x-sh': 'sh',
    'image/svg+xml': 'svg',
    'application/x-shockwave-flash': 'swf',
    'image/tiff': 'tiff',
    'application/typescript': 'ts',
    'font/ttf': 'ttf',
    'application/vnd.visio': 'vsd',
    'application/xhtml+xml': 'xhtml',
    'application/xml': 'xml',
    'application/zip': 'zip',
    'application/x-7z-compressed': '7z',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/x-msdownload': 'exe',
    'application/x-executable': 'exe',
    'font/woff': 'woff',
    'font/woff2': 'woff2',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/3gpp': '3gp',
    'video/3gpp2': '3g2',
};

export interface IReceivedWhatsppOficial {
    token: string;
    fromNumber: string;
    nameContact: string;
    companyId: number;
    message: IMessageReceived;
}

export interface IReceivedReadWhatsppOficialRead {
    messageId: string;
    companyId: number;
    token: string;
}

export interface IMessageReceived {
    type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'location' | 'contacts' | 'sticker' | 'order' | 'reaction' | 'interactive';
    timestamp: number;
    idMessage: string;
    idFile?: string;
    text?: string;
    file?: string; // Base64 do arquivo (apenas para imagens, áudios, stickers)
    mimeType?: string;
    quoteMessageId?: string;
    fileUrl?: string; // ✅ URL da Meta para download direto (vídeos e documentos)
    fileSize?: number; // ✅ Tamanho do arquivo em bytes
}

/**
 * ✅ NOVA FUNÇÃO: Baixa arquivo da URL da Meta e retorna o base64
 */
async function downloadFileFromMetaUrl(
    fileUrl: string, 
    whatsappToken: string,
    fileSize?: number
): Promise<string> {
    try {
        const axios = require('axios');
        
        logger.info(`[META DOWNLOAD] Iniciando download - Tamanho: ${fileSize ? (fileSize / 1024 / 1024).toFixed(2) : '?'} MB`);
        
        const response = await axios.get(fileUrl, {
            headers: {
                'Authorization': `Bearer ${whatsappToken}`,
                'User-Agent': 'curl/7.64.1'
            },
            responseType: 'arraybuffer',
            timeout: 60000 // 60 segundos de timeout
        });

        if (response.status !== 200) {
            throw new Error(`Falha ao baixar arquivo da Meta: HTTP ${response.status}`);
        }

        const base64 = Buffer.from(response.data).toString('base64');
        
        logger.info(`[META DOWNLOAD] ✅ Download concluído - Base64 gerado: ${(base64.length / 1024 / 1024).toFixed(2)} MB`);
        
        return base64;
    } catch (error: any) {
        logger.error(`[META DOWNLOAD] ❌ Erro ao baixar arquivo da Meta: ${error.message}`);
        throw new Error(`Erro ao baixar arquivo da Meta: ${error.message}`);
    }
}

export async function generateVCard(contact: any): Promise<string> {
    const firstName = contact?.name?.first_name || contact?.name?.formatted_name?.split(' ')[0];
    const lastName = String(contact?.name?.formatted_name).replace(firstName, '')
    const formattedName = contact?.name?.formatted_name || '';
    const phoneEntries = contact?.phones?.map((phone: any) => {
        const phoneNumber = phone?.phone || '';
        const waId = phone?.wa_id || '';
        const phoneType = phone?.type || 'CELL';
        return `TEL;type=${phoneType};waid=${waId}:+${phoneNumber}\n`;
    });

    const vcard = `BEGIN:VCARD\n`
        + `VERSION:3.0\n`
        + `N:${lastName};${firstName};;;\n`
        + `FN:${formattedName}\n`
        + `${phoneEntries}`
        + `END:VCARD`;
    return vcard;
}

/**
 * Verifica se o ticket está em estado de avaliação pendente
 */
export const verifyRating = (ticketTraking: any) => {
    if (
        ticketTraking &&
        ticketTraking.finishedAt === null &&
        ticketTraking.closedAt !== null &&
        ticketTraking.userId !== null &&
        ticketTraking.ratingAt === null
    ) {
        return true;
    }
    return false;
};

/**
 * Processa a avaliação do atendimento (NPS)
 */
export const handleRating = async (
    rate: number,
    ticket: Ticket,
    ticketTraking: any
) => {
    const io = getIO();
    const companyId = ticket.companyId;

    const { complationMessage } = await ShowWhatsAppService(
        ticket.whatsappId,
        companyId
    );

    let finalRate = rate;

    if (rate < 0) {
        finalRate = 0;
    }
    if (rate > 10) {
        finalRate = 10;
    }

    await UserRating.create({
        ticketId: ticketTraking.ticketId,
        companyId: ticketTraking.companyId,
        userId: ticketTraking.userId,
        rate: finalRate
    });

    if (
        !isNil(complationMessage) &&
        complationMessage !== "" &&
        !ticket.isGroup
    ) {
        const body = complationMessage
            .replace("{{nome}}", ticket.contact.name || "")
            .replace("{{ticket}}", ticket.id.toString());

        await SendWhatsAppOficialMessage({
            body: body,
            ticket: ticket,
            quotedMsg: null,
            type: 'text',
            media: null,
            vCard: null
        });
    }

    await ticket.update({
        isBot: false,
        status: "closed",
        amountUsedBotQueuesNPS: 0
    });

    // Loga fim de atendimento
    await CreateLogTicketService({
        userId: ticket.userId,
        queueId: ticket.queueId,
        ticketId: ticket.id,
        type: "closed"
    });

    io.of(String(companyId))
        .emit(`company-${companyId}-ticket`, {
            action: "delete",
            ticket,
            ticketId: ticket.id
        });

    io.of(String(companyId))
        .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id
        });
};

// ✅ IMPORTAÇÃO DO CHATBOT LISTENER OFICIAL
import { sayChatbotOficial } from "./ChatBotListenerOficial";

export class ReceibedWhatsAppService {

    constructor() { }

    async getMessage(data: IReceivedWhatsppOficial) {
        try {
            const { message, fromNumber, token } = data;
            let { nameContact } = data;

            // ✅ FIX NOME LID: Se o nameContact for numérico (LID sem @lid) ou vazio,
            // não usar como nome de contato — evita salvar "16265796141093" como nome.
            const isNameLikeLid = nameContact && /^\d{10,}$/.test(nameContact.trim());
            if (!nameContact || isNameLikeLid) {
                // Usar fromNumber como nome provisório (número de telefone é mais legível que LID)
                nameContact = fromNumber;
                logger.info(`[OFICIAL-NOME] nameContact era numérico/vazio (${data.nameContact}), usando fromNumber como nome temporário: ${fromNumber}`);
            }

            // console.log('########################## message', message);

            // ✅ DEDUPLICAÇÃO: Verificar se a mensagem já foi processada (Meta pode enviar webhooks duplicados)
            const existingMessage = await Message.findOne({
                where: { wid: message.idMessage }
            });

            if (existingMessage) {
                logger.info(`[DEDUP] Mensagem ${message.idMessage} já existe, ignorando webhook duplicado`);
                return;
            }

            const conexao = await Whatsapp.findOne({ where: { token } });

            if (!conexao) {
                logger.error('getMessage - Nenhum whatsApp encontrado para token: ' + token);
                return;
            }

            const { companyId } = conexao;

            const whatsapp = await ShowWhatsAppService(conexao.id, companyId);

            // ✅ Detectar se fromNumber é um LID (identificador interno do WhatsApp)
            // LIDs reais têm 15+ dígitos. Números de telefone internacionais têm no máximo 15 dígitos
            // mas números com DDI (ex: 55 + DDD + número) chegam no máximo a 13-14 dígitos.
            // LIDs do WhatsApp são identificadores numéricos muito longos (16+ dígitos normalmente).
            // Usar threshold de 15 para evitar falsos positivos com números reais de 14 dígitos.
            const isLidFormat = fromNumber.length >= 15 && /^\d+$/.test(fromNumber);

            let contact: Contact | null = null;
            let effectiveNumber = fromNumber; // número que será usado para criar/buscar o contato

            if (isLidFormat) {
                // fromNumber é um LID — buscar primeiro por LID no campo lid
                contact = await Contact.findOne({ where: { lid: fromNumber, companyId } });
                logger.info(`[OFICIAL-LID] fromNumber parece ser um LID: ${fromNumber}. Contato encontrado por LID: ${contact?.id || 'não encontrado'}`);
            }

            if (!contact) {
                // Buscar por número normal
                contact = await Contact.findOne({ where: { number: fromNumber, companyId } });
            }

            if (!contact && isLidFormat) {
                // LID não encontrado como número nem como lid — verificar se existe contato com esse lid no campo number
                // (contato criado anteriormente com LID como número, precisamos corrigir)
                const contactWithLidAsNumber = await Contact.findOne({ where: { number: fromNumber, companyId } });
                if (contactWithLidAsNumber) {
                    contact = contactWithLidAsNumber;
                }
            }

            if (!contact) {
                // Criar novo contato — se for LID, usar como lid e manter número limpo
                if (isLidFormat) {
                    // Não temos o número real ainda, usar o LID como identificador temporário
                    // mas marcar que é um LID para evitar duplicatas futuras
                    contact = await Contact.create({
                        name: nameContact,
                        number: fromNumber, // será corrigido quando soubermos o número real
                        lid: fromNumber,    // registrar como LID também
                        companyId,
                        whatsappId: whatsapp.id
                    });
                    logger.info(`[OFICIAL-LID] Novo contato criado com LID como número temporário: id=${contact.id}, lid=${fromNumber}`);
                } else {
                    contact = await Contact.create({
                        name: nameContact,
                        number: fromNumber,
                        companyId,
                        whatsappId: whatsapp.id
                    });
                }
            } else if (isLidFormat && !contact.lid) {
                // Contato encontrado mas sem LID registrado — atualizar com o LID
                await contact.update({ lid: fromNumber });
                logger.info(`[OFICIAL-LID] LID atualizado no contato existente: id=${contact.id}, lid=${fromNumber}`);
            }

            // Atualizar nome do contato se necessário
            // ✅ FIX: Removida restrição contact.number === fromNumber que bloqueava atualização
            // quando contato era encontrado por LID mas número era diferente do fromNumber
            if (contact && nameContact && contact.name !== nameContact) {
                // Só atualizar se o novo nome não for numérico (LID disfarçado de nome)
                const newNameIsLid = /^\d{10,}$/.test(nameContact.trim());
                if (!newNameIsLid) {
                    await contact.update({ name: nameContact });
                }
            }

            let fileName;

            const { file, mimeType, idFile, type, quoteMessageId, fileUrl, fileSize } = message;

            // ✅ NOVO: Processar arquivo da URL da Meta (para vídeos e documentos grandes)
            if (!!fileUrl && !file) {
                logger.info(`[RECEIVED WHATSAPP] Arquivo recebido via URL da Meta - Tipo: ${type}, Tamanho: ${fileSize ? (fileSize / 1024 / 1024).toFixed(2) : '?'} MB`);
                
                try {
                    // Baixar o arquivo da URL da Meta
                    const downloadedBase64 = await downloadFileFromMetaUrl(fileUrl, conexao.send_token, fileSize);
                    
                    // Processar o arquivo baixado
                    const buffer = Buffer.from(downloadedBase64, 'base64');
                    
                    fileName = `${idFile}.${mimeToExtension[mimeType]}`;
                    
                    const folder = path.resolve(__dirname, "..", "..", "..", "public", `company${companyId}`);
                    
                    if (!existsSync(folder)) {
                        mkdirSync(folder, { recursive: true });
                        chmodSync(folder, 0o777)
                    }
                    
                    writeFileSync(`${folder}/${fileName}`, new Uint8Array(buffer));
                    
                    logger.info(`[RECEIVED WHATSAPP] ✅ Arquivo salvo localmente: ${fileName}`);
                } catch (error: any) {
                    logger.error(`[RECEIVED WHATSAPP] ❌ Erro ao processar arquivo da URL: ${error.message}`);
                    // Continua o fluxo mesmo com erro no download
                }
            }
            // ✅ ORIGINAL: Processar arquivo base64 (para imagens, áudios, stickers)
            else if (!!file) {
                logger.info(`[RECEIVED WHATSAPP] Arquivo recebido via Base64 - Tipo: ${type}`);

                const base64Data = file.replace(/^data:image\/\w+;base64,/, '');

                // console.log('base64Data', base64Data); // Removido: loga arquivo inteiro no console

                const buffer = Buffer.from(base64Data, 'base64');

                fileName = `${idFile}.${mimeToExtension[mimeType]}`;

                // console.log('fileName', fileName);

                const folder = path.resolve(__dirname, "..", "..", "..", "public", `company${companyId}`);

                // console.log('folder', folder);

                // const folder = `public/company${companyId}`; // Correção adicionada por Altemir 16-08-2023
                if (!existsSync(folder)) {
                    mkdirSync(folder, { recursive: true }); // Correção adicionada por Altemir 16-08-2023
                    chmodSync(folder, 0o777)
                }

                writeFileSync(`${folder}/${fileName}`, new Uint8Array(buffer));
                
                logger.info(`[RECEIVED WHATSAPP] ✅ Arquivo salvo localmente: ${fileName}`);
            }
            const settings = await CompaniesSettings.findOne({
                where: { companyId }
            });

            const ticket = await FindOrCreateTicketService(
                contact,
                whatsapp,
                0,
                companyId,
                null,
                null,
                null,
                'whatsapp_oficial',
                false,
                false,
                settings
            );

            const ticketTraking = await FindOrCreateATicketTrakingService({
                ticketId: ticket.id,
                companyId,
                userId: null,
                whatsappId: whatsapp.id
            });

            // ✅ Descrição amigável para mídias no card do atendimento
            const mediaDescriptions: Record<string, string> = {
                image: "📷 Imagem",
                video: "🎥 Vídeo",
                audio: "🎵 Áudio",
                document: "📄 Documento",
                sticker: "🏷️ Figurinha",
                location: "📍 Localização",
                contacts: "👤 Contato",
                order: "🛒 Pedido",
            };

            let lastMessageText = message?.text || '';
            if (!lastMessageText && message.type in mediaDescriptions) {
                lastMessageText = mediaDescriptions[message.type];
            }

            await ticket.update({ 
                lastMessage: lastMessageText, 
                unreadMessages: ticket.unreadMessages + 1,
                fromMe: false
            })

            // ✅ Atualizar última interação do cliente para janela de 24h (WhatsApp Oficial)
            await contact.update({
                lastInteractionClient: new Date()
            });

            // Reload do ticket com associações necessárias
            await ticket.reload({
                include: [
                    { model: Contact, as: "contact" },
                    { model: Queue, as: "queue" }
                ]
            });

            /**
             * ✅ TRATAMENTO PARA AVALIAÇÃO DO ATENDENTE (NPS)
             * Deve vir ANTES de salvar a mensagem para evitar processar duas vezes
             */
            if (
                ticket.status === "nps" &&
                ticketTraking !== null &&
                verifyRating(ticketTraking)
            ) {
                // Salvar a mensagem do usuário
                await verifyMessageOficial(message, ticket, contact, companyId, fileName, fromNumber, data, quoteMessageId);

                const bodyMessage = message.text || "";

                if (!isNaN(parseFloat(bodyMessage))) {
                    await handleRating(parseFloat(bodyMessage), ticket, ticketTraking);

                    await ticketTraking.update({
                        ratingAt: moment().toDate(),
                        finishedAt: moment().toDate(),
                        rated: true
                    });

                    return;
                } else {
                    if (ticket.amountUsedBotQueuesNPS < whatsapp.maxUseBotQueuesNPS) {
                        const bodyErrorRating = `\u200eOpção inválida, tente novamente.\n`;
                        
                        await SendWhatsAppOficialMessage({
                            body: bodyErrorRating,
                            ticket: ticket,
                            quotedMsg: null,
                            type: 'text',
                            media: null,
                            vCard: null
                        });

                        await new Promise(resolve => setTimeout(resolve, 1000));

                        const bodyRatingMessage = `\u200e${whatsapp.ratingMessage}\n`;

                        await SendWhatsAppOficialMessage({
                            body: bodyRatingMessage,
                            ticket: ticket,
                            quotedMsg: null,
                            type: 'text',
                            media: null,
                            vCard: null
                        });

                        await ticket.update({
                            amountUsedBotQueuesNPS: ticket.amountUsedBotQueuesNPS + 1
                        });
                    }

                    return;
                }
            }

            await verifyMessageOficial(message, ticket, contact, companyId, fileName, fromNumber, data, quoteMessageId);

            // ✅ VERIFICAÇÃO DE HORÁRIO DE ATENDIMENTO (mesma lógica do wbotMessageListener)
            let currentSchedule;

            if (settings.scheduleType === "company") {
                currentSchedule = await VerifyCurrentSchedule(companyId, 0, 0);
            } else if (settings.scheduleType === "connection") {
                currentSchedule = await VerifyCurrentSchedule(companyId, 0, whatsapp.id);
            }

            try {
                if (
                    settings.scheduleType &&
                    (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
                    !["open", "group"].includes(ticket.status)
                ) {
                    /**
                     * Tratamento para envio de mensagem quando a empresa está fora do expediente
                     */
                    if (
                        (settings.scheduleType === "company" ||
                            settings.scheduleType === "connection") &&
                        !isNil(currentSchedule) &&
                        (!currentSchedule || currentSchedule.inActivity === false)
                    ) {
                        if (
                            whatsapp.maxUseBotQueues &&
                            whatsapp.maxUseBotQueues !== 0 &&
                            ticket.amountUsedBotQueues >= whatsapp.maxUseBotQueues
                        ) {
                            return;
                        }

                        if (whatsapp.timeUseBotQueues !== "0") {
                            if (
                                ticket.isOutOfHour === false &&
                                ticketTraking.chatbotAt !== null
                            ) {
                                await ticketTraking.update({
                                    chatbotAt: null
                                });
                                await ticket.update({
                                    amountUsedBotQueues: 0
                                });
                            }

                            //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
                            let dataLimite = new Date();
                            let Agora = new Date();

                            if (ticketTraking.chatbotAt !== null) {
                                dataLimite.setMinutes(
                                    ticketTraking.chatbotAt.getMinutes() +
                                    Number(whatsapp.timeUseBotQueues)
                                );
                                if (
                                    ticketTraking.chatbotAt !== null &&
                                    Agora < dataLimite &&
                                    whatsapp.timeUseBotQueues !== "0" &&
                                    ticket.amountUsedBotQueues !== 0
                                ) {
                                    return;
                                }
                            }

                            await ticketTraking.update({
                                chatbotAt: null
                            });
                        }

                        if (whatsapp.outOfHoursMessage !== "" && !ticket.imported) {
                            const body = whatsapp.outOfHoursMessage
                                .replace("{{nome}}", contact.name || "")
                                .replace("{{ticket}}", ticket.id.toString());
                                
                            await SendWhatsAppOficialMessage({
                                body: body,
                                ticket: ticket,
                                quotedMsg: null,
                                type: 'text',
                                media: null,
                                vCard: null
                              });
                        }

                        //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
                        await ticket.update({
                            isOutOfHour: true,
                            amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                        });

                        return;
                    }
                }
            } catch (e) {
                logger.error(`[WHATSAPP OFICIAL] Erro ao verificar horário de atendimento: ${e}`);
                console.log(e);
            }

            if (
                !ticket.imported &&
                !ticket.queue &&
                (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
                !ticket.userId &&
                whatsapp?.queues?.length >= 1 &&
                !ticket.useIntegration
            ) {
                // console.log("antes do verifyqueue")
                await verifyQueueOficial(message, ticket, settings, ticketTraking);

                if (ticketTraking.chatbotAt === null) {
                    await ticketTraking.update({
                        chatbotAt: moment().toDate(),
                    })
                }
            }

            // ✅ IMPLEMENTAÇÃO DO SAYCHATBOT PARA API OFICIAL
            if (
                ticket.queue &&
                ticket.queueId &&
                !ticket.useIntegration &&
                !ticket.integrationId &&
                ticket.queue?.chatbots?.length > 0
            ) {
                // ✅ CORRIGIDO: Executar ChatBot apenas se ticket não estiver "open" (aceito por atendente)
                if (ticket.status !== "open") {                                    
                    const simulatedMsg = {
                        key: {
                            fromMe: false,
                            remoteJid: `${fromNumber}@s.whatsapp.net`,
                            id: message.idMessage
                        },
                        message: {
                            buttonsResponseMessage: message.type === "interactive" ? { selectedButtonId: message.text } : undefined,
                            listResponseMessage: message.type === "interactive" ? { singleSelectReply: { selectedRowId: message.text } } : undefined,
                            conversation: message.text || "",
                            timestamp: message.timestamp
                        }
                    };

                    try {
                        await sayChatbotOficial(
                            ticket.queueId,
                            ticket,
                            contact,
                            simulatedMsg,
                            ticketTraking
                        );
                    } catch (error) {
                        console.error("[WHATSAPP OFICIAL] Erro ao executar sayChatbotOficial:", error);
                        logger.error(`[WHATSAPP OFICIAL] Erro sayChatbotOficial: ${error}`);
                    }
                }

                // Atualiza mensagem para indicar que houve atividade e aí contar o tempo novamente para enviar mensagem de inatividade
                await ticket.update({
                    sendInactiveMessage: false
                });
            }

            // ✅ VERIFICAÇÃO DE PALAVRAS-CHAVE (CAMPANHAS DE FLUXO) - API Oficial
            // Verifica se a mensagem faz match com alguma campanha/palavra-chave configurada
            // Isso funciona independente do estado do ticket (sem integrationId)
            if (!ticket.imported && !ticket.isGroup && !ticket.userId && message.text) {
                try {
                    const activeCampaigns = await FlowCampaignModel.findAll({
                        where: {
                            companyId,
                            status: true
                        }
                    });

                    const campaignsForThisWhatsapp = activeCampaigns.filter(campaign => {
                        try {
                            const whatsappIds = campaign.whatsappIds || [];
                            return whatsappIds.includes(whatsapp.id);
                        } catch {
                            return false;
                        }
                    });

                    // Buscar tags do contato para filtragem
                    let contactTagIds: number[] = [];
                    try {
                        const contactTags = await ContactTag.findAll({
                            where: { contactId: contact.id }
                        });
                        contactTagIds = contactTags.map(ct => ct.tagId);
                    } catch (err) {
                        console.error("[PALAVRA-CHAVE OFICIAL] Erro ao buscar tags do contato:", err);
                    }

                    const matchingCampaign = campaignsForThisWhatsapp.find(campaign => {
                        try {
                            if (!campaign.status) return false;
                            // Verificar filtro de tags
                            if (!campaign.matchesContactTags(contactTagIds)) return false;
                            return campaign.matchesMessage(message.text, whatsapp.id);
                        } catch {
                            return false;
                        }
                    });

                    if (matchingCampaign) {
                        console.log(`[PALAVRA-CHAVE OFICIAL] 🚀 Match encontrado! Campanha: ${matchingCampaign.name} (ID: ${matchingCampaign.id}) | Fluxo: ${matchingCampaign.flowId} | Ticket: ${ticket.id}`);

                        const flow = await FlowBuilderModel.findOne({
                            where: {
                                id: matchingCampaign.flowId,
                                company_id: companyId
                            }
                        });

                        if (flow) {
                            const nodes: any[] = flow.flow["nodes"];
                            const connections: any[] = flow.flow["connections"];

                            // Resetar estado do fluxo anterior se existir
                            await ticket.update({
                                flowWebhook: true,
                                lastFlowId: null,
                                hashFlowId: `flow_campaign_${matchingCampaign.id}`,
                                flowStopped: matchingCampaign.flowId.toString(),
                                dataWebhook: null,
                                useIntegration: null,
                                integrationId: null,
                                amountUsedBotQueues: 0 // Reset para permitir execução
                            });

                            const numberPhrase = {
                                number: contact.number,
                                name: contact.name,
                                email: contact.email || ""
                            };

                            await ActionsWebhookService(
                                whatsapp.id,
                                matchingCampaign.flowId,
                                companyId,
                                nodes,
                                connections,
                                null,
                                `flow_campaign_${matchingCampaign.id}`,
                                undefined,
                                undefined,
                                undefined,
                                ticket.id,
                                numberPhrase
                            );

                            console.log(`[PALAVRA-CHAVE OFICIAL] ✅ Fluxo ${matchingCampaign.flowId} executado para ticket ${ticket.id}`);
                            return;
                        } else {
                            console.warn(`[PALAVRA-CHAVE OFICIAL] ⚠️ Fluxo ${matchingCampaign.flowId} não encontrado para campanha ${matchingCampaign.id}`);
                        }
                    }
                } catch (error) {
                    console.error("[PALAVRA-CHAVE OFICIAL] Erro ao verificar campanhas por palavra-chave:", error);
                }
            }

            // ✅ VERIFICAÇÃO DE CAMPANHAS E FLUXOS - executa se ticket tem integrationId ativa
            if (!ticket.imported && !ticket.isGroup && ticket.integrationId && ticket.useIntegration) {
                console.log("[WHATSAPP OFICIAL] Verificando campanhas de fluxo via integrationId do ticket...");

                const contactForCampaign = await ShowContactService(
                    ticket.contactId,
                    ticket.companyId
                );

                try {
                    const queueIntegrations = await ShowQueueIntegrationService(
                        ticket.integrationId,
                        companyId
                    );

                    const simulatedMsgForFlow = {
                        key: {
                            fromMe: false,
                            remoteJid: `${fromNumber}@s.whatsapp.net`,
                            id: message.idMessage || `ofc-${Date.now()}`
                        },
                        message: {
                            conversation: message.text || ticket.lastMessage || "",
                            timestamp: message.timestamp || Math.floor(Date.now() / 1000)
                        }
                    } as any;

                    const campaignExecuted = await flowbuilderIntegration(
                        simulatedMsgForFlow,
                        null,
                        companyId,
                        queueIntegrations,
                        ticket,
                        contactForCampaign,
                        null,
                        null
                    );

                    if (campaignExecuted) {
                        console.log("[WHATSAPP OFICIAL] ✅ Campanha executada, parando outros fluxos");
                        return;
                    }
                } catch (error) {
                    console.error("[WHATSAPP OFICIAL] Erro ao verificar campanhas:", error);
                }
            }

            // ✅ VERIFICAÇÃO DE INTEGRAÇÕES EXISTENTES
            // ✅ CONTINUAÇÃO DE FLUXO WEBHOOK EXISTENTE (sem campanha)
            if (ticket.flowWebhook && ticket.hashFlowId) {
                console.log(`[FLOW WEBHOOK - OFICIAL] Processando fluxo webhook existente para ticket ${ticket.id}`);

                try {
                    const webhook = await WebhookModel.findOne({
                        where: {
                            company_id: ticket.companyId,
                            hash_id: ticket.hashFlowId
                        }
                    });

                    if (webhook && webhook.config["details"]) {
                        const flow = await FlowBuilderModel.findOne({
                            where: {
                                id: webhook.config["details"].idFlow,
                                company_id: companyId
                            }
                        });

                        if (flow) {
                            const nodes: any[] = flow.flow["nodes"];
                            const connections: any[] = flow.flow["connections"];
                            const numberPhrase = { number: contact.number, name: contact.name, email: contact.email || "" };

                            await ActionsWebhookService(
                                whatsapp.id,
                                webhook.config["details"].idFlow,
                                ticket.companyId,
                                nodes,
                                connections,
                                ticket.lastFlowId,
                                ticket.dataWebhook,
                                webhook.config["details"],
                                ticket.hashFlowId,
                                message.text || "",
                                ticket.id,
                                numberPhrase
                            );

                            console.log("[FLOW WEBHOOK - OFICIAL] ✅ Fluxo webhook executado!");
                            return; // Após processar o fluxo, sair para evitar cair em outras verificações
                        } else {
                            console.error(
                                `[FLOW WEBHOOK - OFICIAL] ❌ Fluxo ${webhook.config["details"].idFlow} não encontrado`
                            );
                        }
                    }
                } catch (error) {
                    console.error("[FLOW WEBHOOK - OFICIAL] ❌ Erro ao processar fluxo webhook:", error);
                }
            } else if (ticket.flowWebhook && !ticket.hashFlowId && ticket.flowStopped) {
                // Fallback: continuar fluxo usando flowStopped quando hashFlowId estiver ausente
                try {
                    const recoveredFlowId = parseInt(String(ticket.flowStopped));
                    if (!isNaN(recoveredFlowId)) {
                        const flow = await FlowBuilderModel.findOne({
                            where: { id: recoveredFlowId, company_id: companyId }
                        });

                        if (flow) {
                            console.warn(`[FLOW WEBHOOK - OFICIAL][RECOVERY] Continuando fluxo via flowStopped=${recoveredFlowId} para ticket ${ticket.id}`);

                            const nodes: any[] = flow.flow["nodes"];
                            const connections: any[] = flow.flow["connections"];
                            const recoveryHash = `recovery-${ticket.id}`;
                            const minimalDetails = { idFlow: recoveredFlowId, inputs: [], keysFull: [] } as any;
                            const numberPhrase = { number: contact.number, name: contact.name, email: contact.email || "" };

                            await ActionsWebhookService(
                                whatsapp.id,
                                recoveredFlowId,
                                ticket.companyId,
                                nodes,
                                connections,
                                ticket.lastFlowId,
                                ticket.dataWebhook,
                                minimalDetails,
                                recoveryHash,
                                message.text || "",
                                ticket.id,
                                numberPhrase
                            );

                            console.log("[FLOW WEBHOOK - OFICIAL][RECOVERY] ✅ Fluxo executado via flowStopped");
                            return;
                        }
                    }
                } catch (error) {
                    console.error("[FLOW WEBHOOK - OFICIAL][RECOVERY] ❌ Erro no fallback de fluxo:", error);
                }
            }

            if (
                !ticket.imported &&
                !ticket.queue &&
                !ticket.isGroup &&
                !ticket.user &&
                !isNil(whatsapp.integrationId)
            ) {
                const integrations = await ShowQueueIntegrationService(
                    whatsapp.integrationId,
                    companyId
                );

                // Criar um objeto msg simulado para compatibilidade
                const simulatedMsg = {
                    key: {
                        fromMe: false,
                        remoteJid: `${fromNumber}@s.whatsapp.net`,
                        id: message.idMessage
                    },
                    message: {
                        conversation: message.text || "",
                        timestamp: message.timestamp,
                        text: message.text || ""
                    }
                };

                // ✅ VERIFICAR SE É TYPEBOT
                if (integrations.type === "typebot") {
                    console.log("[TYPEBOT OFICIAL] Enviando mensagem para Typebot");
                    await typebotListenerOficial({ 
                        ticket, 
                        msg: simulatedMsg, 
                        typebot: integrations 
                    });
                    
                    await ticket.update({
                        useIntegration: true,
                        integrationId: integrations.id,
                        typebotSessionTime: moment().toDate()
                    });
                } else {
                    // ✅ OUTRAS INTEGRAÇÕES (n8n, dialogflow, flowbuilder, webhook)
                    await handleMessageIntegration(
                        simulatedMsg as any,
                        null, // wbot é null
                        companyId,
                        integrations,
                        ticket
                    );

                    await ticket.update({
                        useIntegration: true,
                        integrationId: integrations.id
                    });
                }

                return;
            }

            // ✅ VERIFICAÇÃO DE INTEGRAÇÕES NO TICKET
            if (
                !ticket.imported &&
                !ticket.isGroup &&
                !ticket.userId &&
                ticket.integrationId &&
                ticket.useIntegration
            ) {
                const integrations = await ShowQueueIntegrationService(
                    ticket.integrationId,
                    companyId
                );

                // Criar um objeto msg simulado para compatibilidade
                const simulatedMsg = {
                    key: {
                        fromMe: false,
                        remoteJid: `${fromNumber}@s.whatsapp.net`,
                        id: message.idMessage
                    },
                    message: {
                        conversation: message.text || "",
                        timestamp: message.timestamp,
                        text: message.text || ""
                    }
                };

                // ✅ VERIFICAR SE É TYPEBOT
                if (integrations.type === "typebot") {
                    console.log("[TYPEBOT OFICIAL] Continuando conversa com Typebot");
                    await typebotListenerOficial({ 
                        ticket, 
                        msg: simulatedMsg, 
                        typebot: integrations 
                    });
                } else {
                    // ✅ OUTRAS INTEGRAÇÕES (n8n, dialogflow, flowbuilder, webhook)
                    await handleMessageIntegration(
                        simulatedMsg as any,
                        null, // wbot é null
                        companyId,
                        integrations,
                        ticket
                    );
                }
            }

            // ✅ VERIFICAÇÃO: Iniciar FlowBuilder pela integração da conexão WhatsApp (sem fila)
            if (
                !ticket.imported &&
                !ticket.queue &&
                !ticket.isGroup &&
                !ticket.userId &&
                !ticket.useIntegration &&
                !ticket.integrationId &&
                !ticket.flowWebhook &&
                // ✅ CORREÇÃO ANTI-DUPLICAÇÃO: Só iniciar o fluxo se ainda não foi executado neste ticket
                // amountUsedBotQueues é incrementado ao finalizar o fluxo automaticamente
                (isNil(ticket.amountUsedBotQueues) || ticket.amountUsedBotQueues === 0) &&
                !isNil(whatsapp.integrationId)
            ) {
                try {
                    const queueIntegrations = await ShowQueueIntegrationService(
                        whatsapp.integrationId,
                        companyId
                    );

                    logger.info(`[WHATSAPP OFICIAL] Iniciando flowbuilder pela conexão para ticket ${ticket.id}, tipo: ${queueIntegrations?.type || 'indefinido'}`);

                    const simulatedMsgForFlow2 = {
                        key: {
                            fromMe: false,
                            remoteJid: `${fromNumber}@s.whatsapp.net`,
                            id: message.idMessage || `ofc-${Date.now()}`
                        },
                        message: {
                            conversation: message.text || ticket.lastMessage || "",
                            timestamp: message.timestamp || Math.floor(Date.now() / 1000)
                        }
                    } as any;

                    await flowbuilderIntegration(
                        simulatedMsgForFlow2,
                        null,
                        companyId,
                        queueIntegrations,
                        ticket,
                        contact,
                        null,
                        null
                    );

                    logger.info(`[WHATSAPP OFICIAL] flowbuilderIntegration executado para ticket ${ticket.id}`);
                } catch (error) {
                    console.error("[WHATSAPP OFICIAL] Erro ao iniciar flowbuilder pela conexão:", error);
                }
            }

        } catch (error) {
            console.error("[WHATSAPP OFICIAL] Erro em getMessage:", error);
            logger.error(`[WHATSAPP OFICIAL] Erro getMessage: ${error}`);
        }
    }

    async readMessage(data: IReceivedReadWhatsppOficialRead) {
        const { messageId, token, companyId } = data;

        try {
            console.log("data READ", data);
            const conexao = await Whatsapp.findOne({ where: { token, companyId } });

            if (!conexao) {
                logger.error('readMessage - Nenhum whatsApp encontrado');
                return;
            }

            const message = await Message.findOne({ where: { wid: messageId, companyId } });

            if (!message) {
                logger.error(`readMessage - Mensagem não encontrada - ${messageId}`);
                return;
            }
            message.update({ read: true, ack: 2 });
        } catch (error) {
            logger.error(`Erro ao atualizar ack da mensagem ${messageId} - ${error}`);
        }
    }
}