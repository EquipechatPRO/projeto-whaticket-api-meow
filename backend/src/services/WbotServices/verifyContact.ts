import { Mutex } from "async-mutex";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import CreateOrUpdateContactService, {
  updateContact
} from "../ContactServices/CreateOrUpdateContactService";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import WhatsappLidMap from "../../models/WhatsapplidMap";
// Importar o módulo inteiro para acessar a fila
import * as queues from "../../queues";
import logger from "../../utils/logger";
import { IMe } from "./wbotMessageListener";
import { Session } from "../../libs/wbot";

const lidUpdateMutex = new Mutex();

export async function checkAndDedup(
  contact: Contact,
  lid: string
): Promise<void> {
  const lidContact = await Contact.findOne({
    where: {
      companyId: contact.companyId,
      number: {
        [Op.or]: [lid, lid.substring(0, lid.indexOf("@"))]
      }
    }
  });

  if (!lidContact) {
    return;
  }

  await Message.update(
    { contactId: contact.id },
    {
      where: {
        contactId: lidContact.id,
        companyId: contact.companyId
      }
    }
  );

  const allTickets = await Ticket.findAll({
    where: {
      contactId: lidContact.id,
      companyId: contact.companyId
    }
  });

  // Transfer all tickets to main contact instead of closing them
  await Ticket.update(
    { contactId: contact.id },
    {
      where: {
        contactId: lidContact.id,
        companyId: contact.companyId
      }
    }
  );

  if (allTickets.length > 0) {
    console.log(`[RDS CONTATO] Transferidos ${allTickets.length} tickets do contato ${lidContact.id} para ${contact.id}`);
  }

  // Delete the duplicate contact after transferring all data
  await lidContact.destroy();
}

export async function verifyContact(
  msgContact: IMe,
  wbot: Session,
  companyId: number
): Promise<Contact> {
  let profilePicUrl: string;

  // Buscar foto do perfil — só para contatos individuais (não grupos, não LIDs)
  const isLidPre = msgContact.id.includes("@lid") || false;
  const isGroupPre = msgContact.id.includes("@g.us");

  if (!isLidPre && !isGroupPre && wbot) {
    try {
      profilePicUrl = await wbot.profilePictureUrl(msgContact.id, "image");
    } catch (e) {
      profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
    }
  } else if (isGroupPre && wbot) {
    try {
      profilePicUrl = await wbot.profilePictureUrl(msgContact.id, "image");
    } catch (e) {
      profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
    }
  }

  const isLid = msgContact.id.includes("@lid") || false;
  
  const isGroup = msgContact.id.includes("@g.us");
  const isWhatsappNet = msgContact.id.includes("@s.whatsapp.net");

  // Extrair o número do ID
  const idParts = msgContact.id.split('@');
  const extractedId = idParts[0];

  // Extrair qualquer número de telefone adicional que possa estar presente
  const extractedPhone = extractedId.split(':')[0]; // Remove parte após ":" se existir

  // Determinar número e LID adequadamente
  let number = extractedPhone;
  
  let originalLid = msgContact.lid || null;
  

  // Se o ID estiver no formato telefone:XX@s.whatsapp.net, extraia apenas o telefone
  if (isWhatsappNet && extractedId.includes(':')) {
    logger.info(`[RDS-LID-FIX] ID contém separador ':' - extraindo apenas o telefone: ${extractedPhone}`);
  }

  // Verificar se o "número" parece ser um LID (muito longo para ser telefone)
  const isNumberLikelyLid = !isLid && number && number.length > 15 && !isGroup;
  if (isNumberLikelyLid) {
    logger.info(`[RDS-LID-FIX] Número extraído parece ser um LID (muito longo): ${number}`);
  }

  logger.info(`[RDS-LID-FIX] Processando contato - ID original: ${msgContact.id}, número extraído: ${number}, LID detectado: ${originalLid || "não"}`);

  // ✅ FIX NOME: Nunca salvar número como nome do contato.
  // Prioridade: pushName real > notify > verifiedName > manter nome existente
  const rawName = msgContact?.name || msgContact?.notify || msgContact?.verifiedName || "";
  const nameIsNumericOrLid = !rawName || /^\d{10,}$/.test(rawName.trim());
  // Se o nome é numérico/vazio, passar string vazia — CreateOrUpdateContactService vai manter o nome existente
  const contactName = nameIsNumericOrLid ? "" : rawName;

  const contactData = {
    name: contactName, // NÃO usar fallback para número — melhor sem nome do que com número
    number,
    profilePicUrl,
    isGroup,
    companyId,
    lid: originalLid,
    wbot // ✅ Passar wbot para forçar busca de foto do perfil
  };

  if (isGroup) {
    return CreateOrUpdateContactService(contactData);
  }

  return lidUpdateMutex.runExclusive(async () => {
    let foundContact: Contact | null = null;
    if (isLid) {
      
      foundContact = await Contact.findOne({
        where: {
          companyId,
          [Op.or]: [
            { lid: originalLid ? originalLid : msgContact.id },
            { number: number },
            { remoteJid: originalLid ? originalLid : msgContact.id }],
        },
        include: ["tags", "extraInfo", "whatsappLidMap"]
      });
    } else {
      
      foundContact = await Contact.findOne({
        where: {
          companyId,
          number: number
        },
      });
    }
    
    if (isLid) {
      if (foundContact) {
        return updateContact(foundContact, {
          profilePicUrl: contactData.profilePicUrl
        });
      }

      const foundMappedContact = await WhatsappLidMap.findOne({
        where: {
          companyId,
          lid: number
        },
        include: [
          {
            model: Contact,
            as: "contact",
            include: ["tags", "extraInfo"]
          }
        ]
      });

      if (foundMappedContact) {
        return updateContact(foundMappedContact.contact, {
          profilePicUrl: contactData.profilePicUrl
        });
      }

      const partialLidNumber = number.includes("@") ? number.substring(0, number.indexOf("@")) : number;
      const partialLidContact = await Contact.findOne({
        where: {
          companyId,
          number: partialLidNumber
        },
        include: ["tags", "extraInfo"]
      });

      if (partialLidContact) {
        return updateContact(partialLidContact, {
          number: contactData.number,
          profilePicUrl: contactData.profilePicUrl
        });
      }
    } else if (foundContact) {
      if (!foundContact.whatsappLidMap) {
        try {
          // ✅ v7: Tentar resolver LID localmente via WhatsappLidMap antes de chamar onWhatsApp
          let lid: string | null = null;
          const localMapping = await WhatsappLidMap.findOne({
            where: { companyId, contactId: foundContact.id }
          });

          if (localMapping) {
            lid = localMapping.lid;
            logger.info(`[RDS CONTATO] LID resolvido localmente para contato ${foundContact.id}: ${lid}`);
          } else {
            // Fallback: chamar onWhatsApp (pode não retornar lid no v7, mas valida existência)
            const ow = await wbot.onWhatsApp(msgContact.id);

            if (ow?.[0]?.exists) {
              lid = ((ow?.[0] as any)?.lid as string) || null;

              if (lid) {
                await checkAndDedup(foundContact, lid);

                await WhatsappLidMap.findOrCreate({
                  where: { companyId, lid, contactId: foundContact.id },
                  defaults: { companyId, lid, contactId: foundContact.id }
                });
                logger.info(`[RDS CONTATO] LID obtido via onWhatsApp para contato ${foundContact.id}: ${lid}`);
              }
            } else {
              logger.warn(`[RDS CONTATO] Contato ${msgContact.id} não encontrado no WhatsApp, mas continuando processamento`);
            }
          }
        } catch (error) {
          logger.error(`[RDS CONTATO] Erro ao verificar contato ${msgContact.id} no WhatsApp: ${error.message}`);

          try {
            await queues["lidRetryQueue"].add(
              "RetryLidLookup",
              {
                contactId: foundContact.id,
                whatsappId: wbot.id || null,
                companyId,
                number: msgContact.id,
                retryCount: 1,
                maxRetries: 5
              },
              {
                delay: 60 * 1000,
                attempts: 1,
                removeOnComplete: true
              }
            );
            logger.info(`[RDS CONTATO] Agendada retentativa de obtenção de LID para contato ${foundContact.id} (${msgContact.id})`);
          } catch (queueError) {
            logger.error(`[RDS CONTATO] Erro ao adicionar contato ${foundContact.id} à fila de retentativa: ${queueError.message}`);
          }
        }
      }
      return updateContact(foundContact, {
        profilePicUrl: contactData.profilePicUrl
      });
    } else if (!isGroup && !foundContact) {
      let newContact: Contact | null = null;

      try {
        // ✅ v7: Tentar resolver LID localmente primeiro via WhatsappLidMap (por número)
        let lid: string | null = originalLid || null;
        const localLidMap = await WhatsappLidMap.findOne({
          where: { companyId },
          include: [{
            model: Contact,
            as: "contact",
            where: { number }
          }]
        });

        if (localLidMap) {
          lid = localLidMap.lid;
          logger.info(`[RDS CONTATO] LID resolvido localmente para novo contato com número ${number}: ${lid}`);
        }

        // Fallback: chamar onWhatsApp para validar existência e tentar obter LID
        if (!lid) {
          const ow = await wbot.onWhatsApp(msgContact.id);

          if (!ow?.[0]?.exists) {
            if (originalLid && !contactData.lid) {
              contactData.lid = originalLid;
            }
            return CreateOrUpdateContactService(contactData);
          }

          lid = ((ow?.[0] as any)?.lid as string) || originalLid || null;

          // Extrair número normalizado da resposta onWhatsApp
          try {
            const firstItem = ow?.[0] as any;
            if (firstItem?.jid) {
              const owNumber = String(firstItem.jid).split('@')[0];
              if (owNumber && owNumber !== number) {
                logger.debug(`[RDS-LID-FIX] Número normalizado por onWhatsApp: ${owNumber}`);
              }
            }
          } catch (e) {
            logger.error(`[RDS-LID-FIX] Erro ao extrair número da resposta onWhatsApp: ${e.message}`);
          }
        }

        if (lid) {
          const lidContact = await Contact.findOne({
            where: {
              companyId,
              number: {
                [Op.or]: [lid, lid.substring(0, lid.indexOf("@"))]
              }
            },
            include: ["tags", "extraInfo"]
          });

          if (lidContact) {
            await lidContact.update({ lid });

            await WhatsappLidMap.findOrCreate({
              where: { companyId, lid, contactId: lidContact.id },
              defaults: { companyId, lid, contactId: lidContact.id }
            });

            return updateContact(lidContact, {
              number: contactData.number,
              profilePicUrl: contactData.profilePicUrl
            });
          } else {
            const contactDataWithLid = { ...contactData, lid };
            newContact = await CreateOrUpdateContactService(contactDataWithLid);

            if (newContact.lid !== lid) {
              await newContact.update({ lid });
            }

            await WhatsappLidMap.findOrCreate({
              where: { companyId, lid, contactId: newContact.id },
              defaults: { companyId, lid, contactId: newContact.id }
            });

            return newContact;
          }
        }
      } catch (error) {
        logger.error(`[RDS CONTATO] Erro ao verificar contato ${msgContact.id} no WhatsApp: ${error.message}`);

        newContact = await CreateOrUpdateContactService(contactData);
        logger.info(`[RDS CONTATO] Contato criado sem LID devido a erro: ${newContact.id}`);

        try {
          await queues["lidRetryQueue"].add(
            "RetryLidLookup",
            {
              contactId: newContact.id,
              whatsappId: wbot.id || null,
              companyId,
              number: msgContact.id,
              lid: originalLid ? originalLid : msgContact.id,
              retryCount: 1,
              maxRetries: 5
            },
            {
              delay: 60 * 1000,
              attempts: 1,
              removeOnComplete: true
            }
          );
          logger.info(`[RDS CONTATO] Agendada retentativa de obtenção de LID para novo contato ${newContact.id} (${msgContact.id})`);
        } catch (queueError) {
          logger.error(`[RDS CONTATO] Erro ao adicionar contato ${newContact.id} à fila de retentativa: ${queueError.message}`);
        }

        return newContact;
      }
    }

    return CreateOrUpdateContactService(contactData);
  });
}
