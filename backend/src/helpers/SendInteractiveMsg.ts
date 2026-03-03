import { proto, generateWAMessageFromContent, WAMessage, AnyMessageContent } from "@whiskeysockets/baileys";
import { Session } from "../libs/wbot";
import logger from "../utils/logger";

/**
 * Mensagens interativas via Baileys 7 puro.
 * Técnica: generateWAMessageFromContent + viewOnceMessage wrapper + relayMessage.
 * Funciona sem fork — usa apenas o proto nativo do Baileys 7.
 */

// ==================== CORE: relay genérico ====================

const relayInteractive = async (
  wbot: Session,
  jid: string,
  interactivePayload: any
): Promise<WAMessage> => {
  const normalizedInteractive = {
    ...interactivePayload,
    header: interactivePayload?.header ?? { title: "", hasMediaAttachment: false },
  };

  const interactiveMessage = typeof (proto as any)?.Message?.InteractiveMessage?.create === "function"
    ? (proto as any).Message.InteractiveMessage.create(normalizedInteractive)
    : normalizedInteractive;

  const contentObject = {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadataVersion: 2,
          deviceListMetadata: {},
        },
        interactiveMessage,
      },
    },
  };

  const content = typeof (proto as any)?.Message?.fromObject === "function"
    ? (proto as any).Message.fromObject(contentObject)
    : contentObject;

  const msg = generateWAMessageFromContent(
    jid,
    content as any,
    { userJid: (wbot as any).user?.id } as any
  );

  await (wbot as any).relayMessage(jid, msg.message!, {
    messageId: msg.key.id!,
  });

  return msg as WAMessage;
};

// ==================== BOTÕES (quick_reply) ====================

export const sendInteractiveButtons = async (params: {
  wbot: Session;
  jid: string;
  bodyText: string;
  footerText?: string;
  buttons: { displayText: string; id: string }[];
  headerImageUrl?: string;
  headerImageFullPath?: string;
}): Promise<WAMessage> => {
  const { wbot, jid, bodyText, footerText, buttons, headerImageUrl, headerImageFullPath } = params;
  const normalizedButtons = buttons.slice(0, 3);

  // Build header with image if provided
  let header: any = undefined;
  const imageRef = headerImageFullPath || headerImageUrl;
  if (imageRef) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const mime = await import("mime-types");
      
      // Se foi passado um caminho completo, usar direto; senão resolver relativo ao public
      let filePath: string;
      if (headerImageFullPath) {
        filePath = headerImageFullPath;
      } else {
        const publicDir = path.default.resolve(__dirname, "..", "..", "public");
        filePath = path.default.resolve(publicDir, headerImageUrl!);
      }
      
      if (fs.default.existsSync(filePath)) {
        const imageBuffer = fs.default.readFileSync(filePath);
        const mimeType = mime.default.lookup(filePath) || "image/jpeg";
        const jpegThumbnail = imageBuffer;
        
        header = {
          hasMediaAttachment: true,
          imageMessage: {
            url: filePath,
            mimetype: mimeType,
            jpegThumbnail,
          },
        };
        logger.info(`[INTERACTIVE] Header image carregada: ${filePath}`);
      } else {
        logger.warn(`[INTERACTIVE] Header image não encontrada: ${filePath}`);
      }
    } catch (imgErr: any) {
      logger.error(`[INTERACTIVE] Erro ao carregar header image: ${imgErr?.message}`);
    }
  }

  try {
    const payload: any = {
      body: { text: bodyText || " " },
      footer: footerText ? { text: footerText } : undefined,
      nativeFlowMessage: {
        buttons: normalizedButtons.map((btn) => ({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: btn.displayText,
            id: btn.id,
          }),
        })),
      },
    };

    if (header) {
      payload.header = header;
    }

    const msg = await relayInteractive(wbot, jid, payload);

    logger.info(`[INTERACTIVE] Botões (relay) enviados para ${jid} (${normalizedButtons.length} botões${headerImageUrl ? ', com imagem' : ''})`);
    return msg;
  } catch (err: any) {
    logger.error(`[INTERACTIVE] Falha ao enviar botões para ${jid}: ${err?.message}`);
    throw new Error(`Não foi possível enviar botões interativos para ${jid}`);
  }
};

// ==================== LISTA (single_select) ====================

export const sendInteractiveList = async (params: {
  wbot: Session;
  jid: string;
  bodyText: string;
  footerText?: string;
  buttonText: string;
  sections: {
    title: string;
    rows: { title: string; description?: string; id: string }[];
  }[];
}): Promise<WAMessage> => {
  const { wbot, jid, bodyText, footerText, buttonText, sections } = params;

  const safeBodyText = (bodyText || "Selecione uma opção:").trim().slice(0, 1024);
  const safeFooterTextRaw = footerText?.trim().slice(0, 60) || undefined;
  const safeFooterText =
    safeFooterTextRaw &&
    safeFooterTextRaw.toLowerCase() !== safeBodyText.toLowerCase()
      ? safeFooterTextRaw
      : undefined;
  const safeButtonText = (buttonText || "Selecionar").trim().slice(0, 20);

  // WhatsApp lista: até 10 linhas no total
  let rowsCount = 0;
  const normalizedSections = sections
    .filter((sec) => sec?.rows?.length)
    .map((sec) => {
      const sectionTitle = (sec.title || "Opções").trim().slice(0, 24);
      const rows = sec.rows
        .filter((row) => row?.id && row?.title)
        .slice(0, Math.max(0, 10 - rowsCount))
        .map((row, idx) => {
          rowsCount += 1;
          return {
            title: row.title.trim().slice(0, 24),
            description: (row.description || "").trim().slice(0, 72),
            id: String(row.id).trim().slice(0, 200) || `row_${rowsCount}_${idx + 1}`,
          };
        });

      return { title: sectionTitle || "Opções", rows };
    })
    .filter((sec) => sec.rows.length > 0)
    .slice(0, 10);

  if (!normalizedSections.length) {
    throw new Error("Lista interativa sem opções válidas para envio");
  }

  const singleSelectButtonParams = JSON.stringify({
    title: safeButtonText,
    sections: normalizedSections.map((sec) => ({
      title: sec.title,
      rows: sec.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || " ",
      })),
    })),
  });

  const flatRows = normalizedSections.flatMap((s) => s.rows);

  try {
    const msg = await relayInteractive(wbot, jid, {
      body: { text: safeBodyText },
      footer: safeFooterText ? { text: safeFooterText } : undefined,
      nativeFlowMessage: {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: singleSelectButtonParams,
          },
        ],
      },
    });

    logger.info(`[INTERACTIVE] Lista (relay) enviada para ${jid} (${flatRows.length} opções)`);
    return msg;
  } catch (err: any) {
    logger.error(`[INTERACTIVE] Falha ao enviar lista para ${jid}: ${err?.message}`);
    throw new Error(`Não foi possível enviar lista interativa para ${jid}`);
  }
};

// ==================== CTA URL ====================

export const sendInteractiveCTAUrl = async (params: {
  wbot: Session;
  jid: string;
  bodyText: string;
  footerText?: string;
  displayText: string;
  url: string;
}): Promise<WAMessage> => {
  const { wbot, jid, bodyText, footerText, displayText, url } = params;

  try {
    const msg = await relayInteractive(wbot, jid, {
      body: { text: bodyText || " " },
      footer: footerText ? { text: footerText } : undefined,
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: displayText,
              url,
            }),
          },
        ],
      },
    });

    logger.info(`[INTERACTIVE] CTA URL (relay) enviado para ${jid}`);
    return msg;
  } catch (err: any) {
    logger.error(`[INTERACTIVE] Falha ao enviar CTA URL para ${jid}: ${err?.message}`);
    throw new Error(`Não foi possível enviar CTA URL para ${jid}`);
  }
};

// ==================== CTA CALL ====================

export const sendInteractiveCTACall = async (params: {
  wbot: Session;
  jid: string;
  bodyText: string;
  footerText?: string;
  displayText: string;
  phoneNumber: string;
}): Promise<WAMessage> => {
  const { wbot, jid, bodyText, footerText, displayText, phoneNumber } = params;

  try {
    const msg = await relayInteractive(wbot, jid, {
      body: { text: bodyText || " " },
      footer: footerText ? { text: footerText } : undefined,
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_call",
            buttonParamsJson: JSON.stringify({
              display_text: displayText,
              phone_number: phoneNumber,
            }),
          },
        ],
      },
    });

    logger.info(`[INTERACTIVE] CTA Call (relay) enviado para ${jid}`);
    return msg;
  } catch (err: any) {
    logger.error(`[INTERACTIVE] Falha ao enviar CTA Call para ${jid}: ${err?.message}`);
    throw new Error(`Não foi possível enviar CTA Call para ${jid}`);
  }
};

// ==================== CTA COPY (PIX copy code) ====================

export const sendInteractiveCTACopy = async (params: {
  wbot: Session;
  jid: string;
  bodyText: string;
  footerText?: string;
  displayText: string;
  copyCode: string;
}): Promise<WAMessage> => {
  const { wbot, jid, bodyText, footerText, displayText, copyCode } = params;

  try {
    const msg = await relayInteractive(wbot, jid, {
      body: { text: bodyText || " " },
      footer: footerText ? { text: footerText } : undefined,
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: displayText,
              copy_code: copyCode,
            }),
          },
        ],
      },
    });

    logger.info(`[INTERACTIVE] CTA Copy (relay) enviado para ${jid}`);
    return msg;
  } catch (err: any) {
    logger.error(`[INTERACTIVE] Falha ao enviar CTA Copy para ${jid}: ${err?.message}`);
    throw new Error(`Não foi possível enviar CTA Copy para ${jid}`);
  }
};

// ==================== PAYMENT INFO (PIX) ====================

const detectPixKeyType = (key: string): string => {
  if (!key) return "EVP";
  const cleaned = key.replace(/[.\-/]/g, "");
  if (/^\d{11}$/.test(cleaned)) return "CPF";
  if (/^\d{14}$/.test(cleaned)) return "CNPJ";
  if (/^\+?\d{10,13}$/.test(cleaned)) return "PHONE";
  if (key.includes("@")) return "EMAIL";
  return "EVP";
};

export const sendInteractivePaymentInfo = async (params: {
  wbot: Session;
  jid: string;
  bodyText: string;
  footerText?: string;
  pixKey: string;
  pixKeyType?: string;
  pixMerchantName?: string;
}): Promise<WAMessage> => {
  const { wbot, jid, bodyText, footerText, pixKey, pixKeyType, pixMerchantName } = params;
  const keyType = pixKeyType || detectPixKeyType(pixKey);

  const paymentInfoParams = JSON.stringify({
    payment_settings: [
      {
        type: "pix_static_code",
        pix_static_code: {
          merchant_name: pixMerchantName || "Pagamento",
          key: pixKey,
          key_type: keyType,
        },
      },
    ],
  });

  try {
    const msg = await relayInteractive(wbot, jid, {
      body: { text: bodyText || " " },
      footer: footerText ? { text: footerText } : undefined,
      nativeFlowMessage: {
        buttons: [
          {
            name: "payment_info",
            buttonParamsJson: paymentInfoParams,
          },
        ],
      },
    });

    logger.info(`[INTERACTIVE] Payment Info PIX (relay) enviado para ${jid}`);
    return msg;
  } catch (err: any) {
    logger.error(`[INTERACTIVE] Falha ao enviar Payment Info para ${jid}: ${err?.message}`);
    throw new Error(`Não foi possível enviar Payment Info para ${jid}`);
  }
};

// ==================== REVIEW AND PAY (Cobrança / Offer) ====================

export const sendInteractiveReviewAndPay = async (params: {
  wbot: Session;
  jid: string;
  bodyText: string;
  footerText?: string;
  currency?: string;
  totalAmountValue: number;
  referenceId: string;
  type?: string;
  orderStatus?: string;
  items: {
    retailer_id: string;
    name: string;
    amount: { value: number; offset: number };
    quantity: number;
  }[];
  additionalNote?: string;
}): Promise<WAMessage> => {
  const {
    wbot, jid, bodyText, footerText,
    currency = "BRL", totalAmountValue, referenceId,
    type = "digital-goods", orderStatus = "pending",
    items, additionalNote,
  } = params;

  const reviewAndPayParams = JSON.stringify({
    currency,
    payment_configuration: "",
    payment_type: "",
    total_amount: {
      value: String(totalAmountValue),
      offset: "100",
    },
    reference_id: referenceId,
    type,
    payment_method: "confirm",
    payment_status: "captured",
    payment_timestamp: Math.floor(Date.now() / 1000),
    order: {
      status: orderStatus,
      description: "",
      subtotal: {
        value: String(totalAmountValue),
        offset: "100",
      },
      order_type: "PAYMENT_REQUEST",
      items: items.map((item) => ({
        retailer_id: item.retailer_id,
        name: item.name,
        amount: {
          value: String(item.amount.value),
          offset: String(item.amount.offset),
        },
        quantity: String(item.quantity),
      })),
    },
    additional_note: additionalNote || "",
    native_payment_methods: [],
    share_payment_status: false,
  });

  try {
    const msg = await relayInteractive(wbot, jid, {
      body: { text: bodyText || " " },
      footer: footerText ? { text: footerText } : undefined,
      nativeFlowMessage: {
        buttons: [
          {
            name: "review_and_pay",
            buttonParamsJson: reviewAndPayParams,
          },
        ],
      },
    });

    logger.info(`[INTERACTIVE] Review and Pay (relay) enviado para ${jid}`);
    return msg;
  } catch (err: any) {
    logger.error(`[INTERACTIVE] Falha ao enviar Review and Pay para ${jid}: ${err?.message}`);
    throw new Error(`Não foi possível enviar Review and Pay para ${jid}`);
  }
};

// ==================== CAROUSEL ====================

export const sendInteractiveCarousel = async (params: {
  wbot: Session;
  jid: string;
  cards: {
    bodyText: string;
    buttons: { name: string; buttonParamsJson: string }[];
  }[];
}): Promise<WAMessage> => {
  const { wbot, jid, cards } = params;

  try {
    const msg = await relayInteractive(wbot, jid, {
      carouselMessage: {
        cards: cards.map((card) => ({
          body: { text: card.bodyText },
          nativeFlowMessage: {
            buttons: card.buttons.map((btn) => ({
              name: btn.name,
              buttonParamsJson: btn.buttonParamsJson,
            })),
          },
        })),
      },
    });

    logger.info(`[INTERACTIVE] Carousel (relay) enviado para ${jid} (${cards.length} cards)`);
    return msg;
  } catch (err: any) {
    logger.error(`[INTERACTIVE] Falha ao enviar Carousel para ${jid}: ${err?.message}`);
    throw new Error(`Não foi possível enviar Carousel para ${jid}`);
  }
};

// ==================== LOCALIZAÇÃO (estática) ====================

export const sendLocation = async (params: {
  wbot: Session;
  jid: string;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  bodyText?: string;
}): Promise<WAMessage> => {
  const { wbot, jid, latitude, longitude, name, address, bodyText } = params;

  try {
    const content: AnyMessageContent = {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name: name || undefined,
        address: address || undefined,
      },
    };

    if (bodyText) {
      await (wbot as any).sendMessage(jid, { text: bodyText });
    }

    const msg = await (wbot as any).sendMessage(jid, content);

    logger.info(`[INTERACTIVE] Localização enviada para ${jid} (${latitude}, ${longitude})`);
    return msg as WAMessage;
  } catch (err: any) {
    logger.error(`[INTERACTIVE] Falha ao enviar localização para ${jid}: ${err?.message}`);
    throw new Error(`Não foi possível enviar localização para ${jid}`);
  }
};

// ==================== LOCALIZAÇÃO EM TEMPO REAL (live location) ====================

export const sendLiveLocation = async (params: {
  wbot: Session;
  jid: string;
  latitude: number;
  longitude: number;
  accuracyInMeters?: number;
  speed?: number;
  degreesClockwiseFromMagneticNorth?: number;
  sequenceNumber?: number;
  caption?: string;
  bodyText?: string;
}): Promise<WAMessage> => {
  const {
    wbot, jid, latitude, longitude,
    accuracyInMeters = 50,
    speed = 0,
    degreesClockwiseFromMagneticNorth = 0,
    sequenceNumber,
    caption,
    bodyText,
  } = params;

  try {
    if (bodyText) {
      await (wbot as any).sendMessage(jid, { text: bodyText });
    }

    const msg = await (wbot as any).sendMessage(jid, {
      liveLocationMessage: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        accuracyInMeters,
        speedInMps: speed,
        degreesClockwiseFromMagneticNorth,
        caption: caption || `📍 Localização em tempo real`,
        sequenceNumber: sequenceNumber || Date.now(),
        timeOffset: 0,
      },
    });

    logger.info(`[INTERACTIVE] Live Location enviada para ${jid} (${latitude}, ${longitude})`);
    return msg as WAMessage;
  } catch (err: any) {
    logger.error(`[INTERACTIVE] Falha ao enviar Live Location para ${jid}: ${err?.message}`);
    throw new Error(`Não foi possível enviar localização em tempo real para ${jid}`);
  }
};
