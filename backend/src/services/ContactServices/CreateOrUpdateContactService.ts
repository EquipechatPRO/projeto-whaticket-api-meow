// src/services/ContactServices/CreateOrUpdateContactService.ts - CORRIGIDO
import { getIO } from "../../libs/socket";
import CompaniesSettings from "../../models/CompaniesSettings";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import fs from "fs";
import path, { join } from "path";
import logger from "../../utils/logger";
import { isNil } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import * as Sentry from "@sentry/node";
import { ENABLE_LID_DEBUG } from "../../config/debug";
import { normalizeJid } from "../../utils";
import WhatsappLidMap from "../../models/WhatsapplidMap";
const axios = require("axios");

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  birthDate?: Date | string; // 🎂 NOVO CAMPO ADICIONADO
  profilePicUrl?: string;
  companyId: number;
  channel?: string;
  extraInfo?: ExtraInfo[];
  remoteJid?: string;
  lid?: string;
  whatsappId?: number;
  wbot?: any;
  fromMe?: boolean;
}

interface ContactData {
  name?: string;
  number?: string;
  isGroup?: boolean;
  email?: string;
  profilePicUrl?: string;
  companyId?: number;
  extraInfo?: ExtraInfo[];
  channel?: string;
  disableBot?: boolean;
  language?: string;
  lid?: string;
}

export const updateContact = async (
  contact: Contact,
  contactData: ContactData
) => {
  await contact.update(contactData);

  const io = getIO();
  io.to(`company-${contact.companyId}-mainchannel`).emit(
    `company-${contact.companyId}-contact`,
    {
      action: "update",
      contact
    }
  );
  return contact;
};

const CreateOrUpdateContactService = async ({
  name,
  number,
  // number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  birthDate = null, // 🎂 INCLUIR NO DESTRUCTURING
  channel = "whatsapp",
  companyId,
  extraInfo = [],
  remoteJid = "",
  lid = "",
  whatsappId,
  wbot,
  fromMe = false
}: Request): Promise<Contact> => {

  try {
    // ✅ FIX NOME: Nunca usar número como nome do contato
    // Se o nome recebido é vazio, numérico longo ou igual ao número, limpar
    const nameIsNumericOrLid = !name || /^\d{10,}$/.test(name.trim());
    const nameEqualsNumber = name === number || name === number?.replace(/\D/g, "");
    if (nameIsNumericOrLid || nameEqualsNumber) {
      name = ""; // Será tratado abaixo: manter nome existente ou usar placeholder
    }

    // Garantir que o número esteja no formato correto (sem @lid)
    let cleanNumber = number;
    if (!isGroup && cleanNumber.includes('@')) {
      cleanNumber = cleanNumber.substring(0, cleanNumber.indexOf('@'));
      logger.info(`[RDS-LID] Número com formato incorreto corrigido: ${number} -> ${cleanNumber}`);
    }

    // Monta um remoteJid padrão quando não for informado
    const fallbackRemoteJid = normalizeJid(
      remoteJid || (isGroup ? `${cleanNumber}@g.us` : `${cleanNumber}@s.whatsapp.net`)
    );

    let createContact = false;
    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

    const io = getIO();
    let contact: Contact | null;

    if (ENABLE_LID_DEBUG) {
      logger.info(
        `[RDS-LID] Buscando contato: number=${cleanNumber}, companyId=${companyId}, lid=${lid}`
      );
    }
    if (lid) {
      contact = await Contact.findOne({ where: { lid, companyId } });
    }
    if (!contact) {
      contact = await Contact.findOne({ where: { number: cleanNumber, companyId } });
    }

    let updateImage =
      ((!contact ||
        (contact?.profilePicUrl !== profilePicUrl && profilePicUrl !== "")) &&
        (wbot || ["instagram", "facebook"].includes(channel))) ||
      false;

    if (contact) {
      // if (ENABLE_LID_DEBUG) {
      //   logger.info(
      //     `[RDS-LID] Contato encontrado: id=${contact.id}, number=${contact.number}, jid=${contact.remoteJid}, lid=${contact.lid}`
      //   );
      // }
      contact.remoteJid = fallbackRemoteJid;
      if (!contact.lid) {
        contact.lid = lid;
      }
      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] fromMe recebido: ${fromMe}`);
      }

      // Atualizar LID quando disponível
      if (lid && lid !== "") {
        if (contact.lid !== lid) {
          if (ENABLE_LID_DEBUG) {
            logger.info(
              `[RDS-LID] Atualizando lid do contato: de='${contact.lid}' para='${lid}'`
            );
          }
          contact.lid = lid;
        }
      } else if (fromMe === false && contact.lid && fallbackRemoteJid) {
        // Se não temos lid mas temos um remoteJid, tenta obter o lid localmente primeiro
        // ✅ v7: Consultar WhatsappLidMap antes de chamar onWhatsApp
        const localMap = await WhatsappLidMap.findOne({
          where: { companyId, contactId: contact.id }
        });

        if (localMap) {
          if (localMap.lid !== contact.lid) {
            if (ENABLE_LID_DEBUG) {
              logger.info(
                `[RDS-LID] LID resolvido localmente: de='${contact.lid}' para='${localMap.lid}'`
              );
            }
            contact.lid = localMap.lid;
          }
        } else if (wbot) {
          // Fallback: chamar onWhatsApp (pode não retornar lid no v7)
          try {
            const ow = await wbot.onWhatsApp(fallbackRemoteJid);
            if (ow?.[0]?.exists && ow?.[0]?.lid) {
              const lidFromLookup = ow[0].lid as string;
              if (lidFromLookup && lidFromLookup !== contact.lid) {
                if (ENABLE_LID_DEBUG) {
                  logger.info(
                    `[RDS-LID] Atualizando lid obtido via onWhatsApp fallback: de='${contact.lid}' para='${lidFromLookup}'`
                  );
                }
                contact.lid = lidFromLookup;

                // Persistir no WhatsappLidMap para futuras consultas locais
                await WhatsappLidMap.findOrCreate({
                  where: { companyId, lid: lidFromLookup, contactId: contact.id },
                  defaults: { companyId, lid: lidFromLookup, contactId: contact.id }
                });
              }
            }
          } catch (error) {
            if (ENABLE_LID_DEBUG) {
              logger.error(`[RDS-LID] Erro ao consultar LID via onWhatsApp fallback: ${error.message}`);
            }
          }
        }
      }
      contact.profilePicUrl = profilePicUrl || null;
      contact.isGroup = isGroup;

      // 🎂 ATUALIZAR DATA DE NASCIMENTO SE FORNECIDA
      if (birthDate !== null && birthDate !== undefined) {
        let processedBirthDate: Date | null = null;
        if (typeof birthDate === "string") {
          processedBirthDate = new Date(birthDate);
          // Validar se a data é válida
          if (!isNaN(processedBirthDate.getTime())) {
            contact.birthDate = processedBirthDate;
          }
        } else {
          contact.birthDate = birthDate;
        }
      }

      if (isNil(contact.whatsappId) && !isNil(whatsappId)) {
        const whatsapp = await Whatsapp.findOne({
          where: { id: whatsappId, companyId }
        });

        if (whatsapp) {
          contact.whatsappId = whatsappId;
        }
      }

      const folder = path.resolve(
        publicFolder,
        `company${companyId}`,
        "contacts"
      );

      let fileName,
        oldPath = "";
      if (contact.urlPicture) {
        oldPath = path.resolve(contact.urlPicture.replace(/\\/g, "/"));
        fileName = path.join(folder, oldPath.split("\\").pop());
      }

      // ✅ Forçar busca de foto: sempre tentar quando tem wbot e foto está vazia, é nopicture, ou mudou
      const currentPicIsEmpty = !contact.profilePicUrl || contact.profilePicUrl === "" || contact.profilePicUrl.includes("nopicture");
      const needsImageUpdate =
        currentPicIsEmpty ||
        !fileName ||
        !fs.existsSync(fileName) ||
        (profilePicUrl && profilePicUrl !== "" && contact.profilePicUrl !== profilePicUrl && !profilePicUrl.includes("nopicture"));

      if (needsImageUpdate && wbot) {
        try {
          const targetJid = contact.remoteJid || fallbackRemoteJid;
          const fetchedPic = await wbot.profilePictureUrl(targetJid, "image");
          if (fetchedPic) {
            profilePicUrl = fetchedPic;
          }
        } catch (e) {
          // Se já tem foto, manter. Se não, usar placeholder.
          if (!currentPicIsEmpty) {
            profilePicUrl = contact.profilePicUrl;
          } else {
            profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
          }
        }
        contact.profilePicUrl = profilePicUrl;
        updateImage = true;
      } else if (needsImageUpdate && profilePicUrl && profilePicUrl !== "" && !profilePicUrl.includes("nopicture")) {
        contact.profilePicUrl = profilePicUrl;
        updateImage = true;
      }

      // ✅ FIX NOME: Nunca sobrescrever um nome real com número.
      // Atualizar nome SOMENTE se:
      // 1. Nome atual é igual ao número (foi salvo errado)
      // 2. Nome atual é numérico longo (parece LID/número)
      // 3. E o nome novo é um nome REAL (não numérico)
      const currentNameIsNumericLid = contact.name && /^\d{10,}$/.test(contact.name.trim());
      const newNameIsNumericLid = name && /^\d{10,}$/.test(name.trim());
      const currentNameIsNumber = contact.name === number || contact.name === cleanNumber;
      const newNameIsReal = name && !newNameIsNumericLid && name !== number && name !== cleanNumber;
      
      // Atualizar se o nome atual é um número/LID E o novo nome é real
      if ((currentNameIsNumber || currentNameIsNumericLid || !contact.name) && newNameIsReal) {
        contact.name = name;
      }
      // NUNCA sobrescrever um nome real existente com um número
      // Se o contato já tem nome real, manter ele

      await contact.save(); // Ensure save() is called to trigger updatedAt
      await contact.reload();
      // if (ENABLE_LID_DEBUG) {
      //   logger.info(
      //     `[RDS-LID] Contato atualizado: id=${contact.id}, number=${contact.number}, jid=${contact.remoteJid}, lid=${contact.lid}`
      //   );
      // }
    } else if (["whatsapp"].includes(channel)) {
      const settings = await CompaniesSettings.findOne({
        where: { companyId }
      });
      const acceptAudioMessageContact = settings?.acceptAudioMessageContact;
      const newRemoteJid = fallbackRemoteJid;

      // if (!remoteJid && remoteJid !== "") {
      //   newRemoteJid = isGroup
      //     ? `${rawNumber}@g.us`
      //     : `${rawNumber}@s.whatsapp.net`;
      // }

      if (ENABLE_LID_DEBUG) {
        logger.info(
          `[RDS-LID] Criando novo contato: number=${number}, jid=${newRemoteJid}, lid=${lid}`
        );
      }
      if (wbot) {
        try {
          profilePicUrl = await wbot.profilePictureUrl(newRemoteJid, "image");
        } catch (e) {
          profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
        }
      } else {
        profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      }

      // 🎂 PROCESSAR DATA DE NASCIMENTO PARA NOVO CONTATO
      let processedBirthDate: Date | null = null;
      if (birthDate) {
        if (typeof birthDate === "string") {
          processedBirthDate = new Date(birthDate);
          // Validar se a data é válida
          if (isNaN(processedBirthDate.getTime())) {
            processedBirthDate = null;
          }
        } else {
          processedBirthDate = birthDate;
        }
      }

      try {
        // Verificar se conseguimos obter o LID via API do WhatsApp
        let lidToUse = lid || null;

        // ✅ v7: Consultar WhatsappLidMap localmente antes de chamar onWhatsApp
        if (!lidToUse) {
          const localMap = await WhatsappLidMap.findOne({
            where: { companyId },
            include: [{
              model: Contact,
              as: "contact",
              where: { number: cleanNumber }
            }]
          });

          if (localMap) {
            lidToUse = localMap.lid;
            if (ENABLE_LID_DEBUG) {
              logger.info(
                `[RDS-LID] LID resolvido localmente para novo contato: ${lidToUse}`
              );
            }
          }
        }

        // Fallback: Se não temos LID e temos wbot, tenta consultar via onWhatsApp
        if (!lidToUse && wbot && newRemoteJid) {
          try {
            const ow = await wbot.onWhatsApp(newRemoteJid);
            if (ow?.[0]?.exists && ow?.[0]?.lid) {
              lidToUse = ow[0].lid as string;
              if (ENABLE_LID_DEBUG) {
                logger.info(
                  `[RDS-LID] LID obtido via onWhatsApp fallback para novo contato: ${lidToUse}`
                );
              }
            }
          } catch (error) {
            if (ENABLE_LID_DEBUG) {
              logger.error(`[RDS-LID] Erro ao consultar LID via onWhatsApp para novo contato: ${error.message}`);
            }
          }
        }

        // Criando contato com LID quando disponível
        contact = await Contact.create({
          name: name || cleanNumber, // Usar número como fallback APENAS na criação inicial
          number: cleanNumber, // Usar o número limpo aqui
          email,
          birthDate: processedBirthDate, // 🎂 INCLUIR NO CREATE
          isGroup,
          companyId,
          channel,
          acceptAudioMessage:
            acceptAudioMessageContact === "enabled" ? true : false,
          remoteJid: normalizeJid(newRemoteJid),
          lid: lidToUse, // Usa o LID obtido da API ou o passado no parâmetro
          profilePicUrl,
          urlPicture: "",
          whatsappId
        });
        if (ENABLE_LID_DEBUG) {
          logger.info(
            `[RDS-LID] Novo contato criado: id=${contact.id}, number=${contact.number}, jid=${contact.remoteJid}, lid=${contact.lid}`
          );
        }
        createContact = true;
      } catch (err) {
        // Verificar se é erro de unicidade (contato já existe)
        if (err.name === 'SequelizeUniqueConstraintError') {
          logger.info(`[RDS-CONTACT] Contato já existe, buscando e reativando: number=${number}, companyId=${companyId}`);

          // Buscar o contato existente que pode estar inativo
          contact = await Contact.findOne({
            where: {
              number,
              companyId
            }
          });

          if (contact) {
            // Reativar o contato se estiver inativo
            if (!contact.active) {
              await contact.update({
                active: true,
                profilePicUrl,
                remoteJid: normalizeJid(newRemoteJid),
                lid: lid || null
              });

              logger.info(`[RDS-CONTACT] Contato reativado: id=${contact.id}, number=${contact.number}`);
            }
          } else {
            // Caso muito improvável - erro de unicidade, mas contato não encontrado
            logger.error(`[RDS-CONTACT] Erro de unicidade, mas contato não encontrado: ${err.message}`);
            throw err;
          }
        } else {
          // Outros erros são repassados
          logger.error(`[RDS-CONTACT] Erro ao criar contato: ${err.message}`);
          throw err;
        }
      }
    } else if (["facebook", "instagram"].includes(channel)) {
      // 🎂 PROCESSAR DATA DE NASCIMENTO PARA REDES SOCIAIS - CORREÇÃO DE TIMEZONE
      let processedBirthDate: Date | null = null;
      if (birthDate) {
        if (typeof birthDate === "string") {
          // Se vier no formato ISO, extrair apenas a parte da data
          const dateOnly = birthDate.split('T')[0];
          // Criar data local com meio-dia para evitar problemas de timezone
          const [year, month, day] = dateOnly.split('-').map(Number);
          processedBirthDate = new Date(year, month - 1, day, 12, 0, 0);
        } else if (birthDate instanceof Date) {
          // Se for objeto Date, criar nova data local com meio-dia
          const year = birthDate.getFullYear();
          const month = birthDate.getMonth();
          const day = birthDate.getDate();
          processedBirthDate = new Date(year, month, day, 12, 0, 0);
        }
      }

      try {
        contact = await Contact.create({
          name,
          number: cleanNumber, // Usar o número limpo aqui
          email,
          birthDate: processedBirthDate, // 🎂 INCLUIR NO CREATE
          isGroup,
          companyId,
          channel,
          profilePicUrl,
          urlPicture: "",
          whatsappId
        });
        createContact = true;
      } catch (err) {
        // Verificar se é erro de unicidade (contato já existe)
        if (err.name === 'SequelizeUniqueConstraintError') {
          logger.info(`[RDS-CONTACT] Contato social já existe, buscando e reativando: number=${number}, companyId=${companyId}, canal=${channel}`);

          // Buscar o contato existente que pode estar inativo
          contact = await Contact.findOne({
            where: {
              number: cleanNumber, // Usar o número limpo aqui
              companyId,
              channel
            }
          });

          if (contact) {
            // Reativar o contato se estiver inativo
            if (!contact.active) {
              await contact.update({
                active: true,
                profilePicUrl
              });

              logger.info(`[RDS-CONTACT] Contato social reativado: id=${contact.id}, number=${contact.number}, canal=${channel}`);
            }
          } else {
            // Caso muito improvável - erro de unicidade, mas contato não encontrado
            logger.error(`[RDS-CONTACT] Erro de unicidade no contato social, mas contato não encontrado: ${err.message}`);
            throw err;
          }
        } else {
          // Outros erros são repassados
          logger.error(`[RDS-CONTACT] Erro ao criar contato social: ${err.message}`);
          throw err;
        }
      }
    }

    // Se ainda não temos contato aqui, não prossiga para evitar null reference
    if (!contact) {
      throw new Error(
        "Não foi possível criar ou localizar o contato. Informe o número/canal corretamente."
      );
    }

    if (updateImage) {
      const folder = path.resolve(
        publicFolder,
        `company${companyId}`,
        "contacts"
      );

      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        fs.chmodSync(folder, 0o777);
      }

      let filename;
      if (isNil(profilePicUrl) || profilePicUrl.includes("nopicture")) {
        filename = "nopicture.png";
      } else {
        filename = `${contact.id}.jpeg`;
        const filePath = join(folder, filename);

        // Verifica se o arquivo já existe e se o profilePicUrl não mudou
        if (fs.existsSync(filePath) && contact.urlPicture === filename) {
          // Arquivo já existe e é o mesmo, não precisa baixar novamente
          updateImage = false;
        } else {
          // Remove arquivo antigo se existir
          if (!isNil(contact.urlPicture) && contact.urlPicture !== filename) {
            const oldPath = path.resolve(
              contact.urlPicture.replace(/\\/g, "/")
            );
            const oldFileName = path.join(folder, oldPath.split("\\").pop());

            if (fs.existsSync(oldFileName)) {
              fs.unlinkSync(oldFileName);
            }
          }

          const response = await axios.get(profilePicUrl, {
            responseType: "arraybuffer"
          });

          // Save the image to the directory
          fs.writeFileSync(filePath, response.data);
        }
      }

      // Atualiza o contato apenas se a imagem mudou ou se não tinha urlPicture
      if (updateImage || isNil(contact.urlPicture)) {
        await contact.update({
          urlPicture: filename,
          pictureUpdated: true
        });

        await contact.reload();
      }
    }

    if (createContact) {
      io.of(String(companyId)).emit(`company-${companyId}-contact`, {
        action: "create",
        contact
      });
    } else {
      io.of(String(companyId)).emit(`company-${companyId}-contact`, {
        action: "update",
        contact
      });
    }

    if (ENABLE_LID_DEBUG) {
      logger.info(
        `[RDS-LID] Retornando contato: { jid: '${contact.remoteJid}', exists: true, lid: '${contact.lid}' }`
      );
    }
    return contact;
  } catch (err) {
    logger.error("Error to find or create a contact:", err);
    throw err;
  }
};

export default CreateOrUpdateContactService;
