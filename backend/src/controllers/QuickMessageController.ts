import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListService from "../services/QuickMessageService/ListService";
import CreateService from "../services/QuickMessageService/CreateService";
import ShowService from "../services/QuickMessageService/ShowService";
import UpdateService from "../services/QuickMessageService/UpdateService";
import DeleteService from "../services/QuickMessageService/DeleteService";
import FindService from "../services/QuickMessageService/FindService";

import QuickMessage from "../models/QuickMessage";
import { head } from "lodash";
import fs from "fs";
import path from "path";

import AppError from "../errors/AppError";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import logger from "../utils/logger";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  userId: string | number;
};

type StoreData = {
  shortcode: string;
  message: string;
  userId: number | number;
  mediaPath?: string;
  mediaName?: string;
  mediaType?: string;
  geral: boolean;
  isMedia: boolean;
  visao: boolean;
  isOficial: boolean;
  language?: string;
  status?: string;
  category?: string;
  metaID?: string;
};

type FindParams = {
  companyId: string;
  userId: string;
  isOficial: string;
  status: string;
  whatsappId?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId, id: userId } = req.user;

  // Respostas rápidas nunca mostram templates oficiais (gerenciados em /template-manager)
  const { records, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId,
    userId,
    isOficial: false
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as StoreData;

  const schema = Yup.object().shape({
    shortcode: Yup.string().required(),
    message: data.isMedia ? Yup.string().notRequired() : Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const record = await CreateService({
    ...data,
    companyId,
    userId: req.user.id
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-quickmessage`, {
      action: "create",
      record
    });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  
  const record = await ShowService(id, companyId);

  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body as StoreData;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    shortcode: Yup.string().required(),
    message: data.isMedia ? Yup.string().notRequired() : Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;

  const record = await UpdateService({
    ...data,
    userId: req.user.id,
    id,
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-quickmessage`, {
      action: "update",
      record
    });

  return res.status(200).json(record);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteService(id);

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-quickmessage`, {
      action: "delete",
      id
    });

  return res.status(200).json({ message: "Contact deleted" });
};

export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id: userId, companyId } = req.user;
  const params = {
    ...req.query as FindParams,
    userId: String(userId),
    companyId: String(companyId)
  };
  const records = await FindService(params);

  return res.status(200).json(records);
};

export const audioUpload = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    if (!file) throw new AppError("Nenhum arquivo recebido");
    
    logger.info(`[QUICKMSG] Processando áudio: ${file.originalname} (mime: ${file.mimetype}, size: ${file.size})`);

    const quickmessage = await QuickMessage.findByPk(id);
    if (!quickmessage) {
      throw new AppError("Quick message não encontrada");
    }
    
    // ✅ CORREÇÃO: Garantir que seja sempre salvo como tipo 'audio'
    // independente do mimetype original (webm, ogg, etc)
    await quickmessage.update({
      mediaPath: file.filename, // Nome que o multer gerou (sempre .ogg)
      mediaName: file.originalname || `Áudio gravado - ${new Date().toLocaleString()}`,
      mediaType: 'audio' // ✅ SEMPRE 'audio' para compatibilidade
    });

    logger.info(`[QUICKMSG] Quick message atualizada: id=${quickmessage.id}, mediaPath=${quickmessage.mediaPath}`);

    return res.send({ 
      mensagem: "Áudio gravado anexado com sucesso",
      mediaPath: file.filename,
      mediaName: file.originalname,
      mediaType: 'audio'
    });
  } catch (err: any) {
    logger.error(`[QUICKMSG] Erro no audioUpload: ${err}`);
    throw new AppError(err.message);
  }
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    const quickmessage = await QuickMessage.findByPk(id);
    
    // ✅ CORREÇÃO: Melhor detecção do tipo de mídia
    const fileExtension = path.extname(file.originalname).toLowerCase();
    let mediaType = 'document'; // padrão
    
    // ✅ CORREÇÃO: Detectar áudio por extensão E mimetype
    if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm'].includes(fileExtension) || 
        file.mimetype.startsWith('audio/')) {
      mediaType = 'audio';
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension)) {
      mediaType = 'image';
    } else if (['.mp4', '.avi', '.mov'].includes(fileExtension)) {
      mediaType = 'video';
    }

    logger.debug(`[QUICKMSG] Tipo de mídia detectado: ${file.originalname} → ${mediaType}`);

    await quickmessage.update({
      mediaPath: file.filename,
      mediaName: file.originalname,
      mediaType: mediaType
    });

    return res.send({ 
      mensagem: "Arquivo Anexado",
      mediaType: mediaType
    });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user

  try {
    const quickmessage = await QuickMessage.findByPk(id);
    const filePath = path.resolve("public", `company${companyId}`, "quickMessage", quickmessage.mediaName);
    const fileExists = fs.existsSync(filePath);
    if (fileExists) {
      fs.unlinkSync(filePath);
    }
    await quickmessage.update({
      mediaPath: null,
      mediaName: null,
      mediaType: null
    });

    return res.send({ mensagem: "Arquivo Excluído" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};