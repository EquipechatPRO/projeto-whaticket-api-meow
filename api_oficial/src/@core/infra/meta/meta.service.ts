import { Logger } from '@nestjs/common';
import {
  IBodyReadMessage,
  IMetaMessage,
  IResultTemplates,
  IReturnAuthMeta,
  IReturnMessageFile,
  IReturnMessageMeta,
} from './interfaces/IMeta.interfaces';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { convertMimeTypeToExtension } from 'src/@core/common/utils/convertMimeTypeToExtension';
import axios from 'axios';
import { lookup } from 'mime-types';
import { deleteFile } from 'src/@core/common/utils/files.utils';

export class MetaService {
  private readonly logger: Logger = new Logger(`${MetaService.name}`);
  urlMeta = `https://graph.facebook.com/v20.0`;

  path = `./public`;

  constructor() {}

  /**
   * Retry com backoff exponencial para falhas temporárias de rede.
   * Retenta apenas erros de rede/timeout (sem response da Meta = falha de conexão).
   * Erros 4xx da Meta NÃO são retentados (ex: token inválido, payload errado).
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    label: string,
    maxRetries: number = 3,
    baseDelayMs: number = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const isNetworkError = !error?.response; // sem response = falha de rede/timeout
        const isRetryableStatus = error?.response?.status >= 500; // 5xx da Meta

        if ((isNetworkError || isRetryableStatus) && attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s
          this.logger.warn(
            `[RETRY] ${label} - Tentativa ${attempt}/${maxRetries} falhou (${error?.code || error?.message}). Retentando em ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error; // erro não retentável ou última tentativa
        }
      }
    }
    throw new Error(`[RETRY] ${label} - Todas as ${maxRetries} tentativas falharam`);
  }

  async send<T>(
    url: string,
    token: string,
    existFile: boolean = false,
  ): Promise<T | any> {
    const headers = {
      'Content-Type': !!existFile ? 'arraybuffer' : 'application/json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'curl/7.64.1',
    };

    const result = await axios.get(url, {
      headers,
      timeout: 30000,
    });

    return result.data as T;
  }

  async authFileMeta(
    idMessage: string,
    phone_number_id: string,
    token: string,
  ): Promise<IReturnAuthMeta> {
    try {
      const url = `https://graph.facebook.com/v20.0/${idMessage}?phone_number_id=${phone_number_id}`;

      return await this.send<IReturnAuthMeta>(url, token);
    } catch (error: any) {
      this.logger.error(`authDownloadFile - ${error.message}`);
      throw Error('Erro ao converter o arquivo');
    }
  }

  /**
   * ✅ NOVO: Retorna apenas os metadados do arquivo (URL, mimeType, tamanho)
   * sem baixar o arquivo completo. Útil para vídeos e documentos grandes.
   */
  async getFileMetadata(
    idMessage: string,
    phone_number_id: string,
    token: string,
  ): Promise<{ url: string; mimeType: string; fileSize: number }> {
    try {
      const auth = await this.authFileMeta(idMessage, phone_number_id, token);
      
      this.logger.log(`[GET METADATA] Arquivo ${idMessage} - URL obtida, tamanho: ${auth.file_size} bytes`);
      
      return {
        url: auth.url,
        mimeType: auth.mime_type,
        fileSize: auth.file_size,
      };
    } catch (error: any) {
      this.logger.error(`getFileMetadata - ${error.message}`);
      throw Error('Erro ao obter metadados do arquivo');
    }
  }

  async downloadFileMeta(
    idMessage: string,
    phone_number_id: string,
    token: string,
    companyId: number,
    conexao: number,
  ): Promise<{ base64: string; mimeType: string }> {
    try {
      const auth = await this.authFileMeta(idMessage, phone_number_id, token);

      if (!existsSync(this.path)) mkdirSync(this.path);
      if (!existsSync(`${this.path}/${companyId}`))
        mkdirSync(`${this.path}/${companyId}`);
      if (!existsSync(`${this.path}/${companyId}/${conexao}`))
        mkdirSync(`${this.path}/${companyId}/${conexao}`);

      const pathFile = `${this.path}/${companyId}/${conexao}`;

      const mimeType = convertMimeTypeToExtension(auth.mime_type);

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'curl/7.64.1',
      };

      const result = await axios.get(auth.url, {
        headers,
        responseType: 'arraybuffer',
      });

      if (result.status != 200)
        throw new Error('Falha em baixar o arquivo da meta');

      const base64 = result.data.toString('base64');

      writeFileSync(`${pathFile}/${idMessage}.${mimeType}`, result.data);

      return {
        base64,
        mimeType: auth.mime_type,
      };
    } catch (error: any) {
      console.log(error);
      this.logger.error(`authDownloadFile - ${error.message}`);
      throw Error('Erro ao converter o arquivo');
    }
  }

  async sendFileToMeta(
    numberId: string,
    token: string,
    pathFile: string,
  ): Promise<IReturnMessageFile | null> {
    try {
      // Verificar se o arquivo existe antes de tentar ler
      const { existsSync, statSync } = require('fs');
      if (!existsSync(pathFile)) {
        throw new Error(`Arquivo não encontrado no caminho: ${pathFile}`);
      }

      const fileStats = statSync(pathFile);
      this.logger.log(`sendFileToMeta - Arquivo: ${pathFile}, Tamanho: ${fileStats.size} bytes`);

      if (fileStats.size === 0) {
        throw new Error(`Arquivo está vazio: ${pathFile}`);
      }

      const file = readFileSync(pathFile);

      const mimeType = lookup(pathFile);
      if (!mimeType) {
        // Tentar detectar pelo nome original ou usar fallback
        this.logger.warn(`sendFileToMeta - Não foi possível detectar MIME type para: ${pathFile}, usando application/octet-stream`);
      }

      const finalMimeType = mimeType || 'application/octet-stream';
      this.logger.log(`sendFileToMeta - MIME type: ${finalMimeType}, numberId: ${numberId}`);

      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', finalMimeType);
      formData.append('file', file, {
        filename: pathFile.split('/').pop(),
        contentType: finalMimeType,
      });

      const result = await this.withRetry(
        () =>
          axios.post(`${this.urlMeta}/${numberId}/media`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              ...formData.getHeaders(),
            },
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          }),
        `sendFileToMeta(${numberId})`,
        3,
        2000,
      );

      return result.data as IReturnMessageFile;
    } catch (error: any) {
      try { deleteFile(pathFile); } catch (e) { /* ignore cleanup error */ }
      const detail = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error?.message || String(error);
      this.logger.error(`sendFileToMeta - ERRO DETALHADO: ${detail}`);
      this.logger.error(`sendFileToMeta - Status HTTP: ${error?.response?.status || 'N/A'}`);
      this.logger.error(`sendFileToMeta - Path arquivo: ${pathFile}`);
      throw Error(`Erro ao enviar o arquivo para a meta: ${detail}`);
    }
  }

  async sendMessage(numberId: string, token: string, message: IMetaMessage) {
    try {
      const result = await this.withRetry(
        () =>
          axios.post(`${this.urlMeta}/${numberId}/messages`, message, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            timeout: 60000,
          }),
        `sendMessage(${numberId})`,
      );

      return result.data as IReturnMessageMeta;
    } catch (error: any) {
      const detail = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error?.message || String(error);
      this.logger.error(`sendMessage - ${detail}`);
      throw Error('Erro ao enviar a mensagem');
    }
  }

  async getListTemplates(wabaId: string, token: string) {
    try {
      const result = await axios.get(
        `${this.urlMeta}/${wabaId}/message_templates`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        },
      );

      return result.data as IResultTemplates;
    } catch (error: any) {
      const detail = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error?.message || String(error);
      this.logger.error(`getListTemplates - ${detail}`);

      // Detectar token expirado/inválido (Meta retorna código 190 para OAuthException)
      const metaError = error?.response?.data?.error;
      if (
        error?.response?.status === 401 ||
        metaError?.code === 190 ||
        metaError?.type === 'OAuthException'
      ) {
        throw Error('TOKEN_EXPIRED: O token de acesso da Meta expirou ou é inválido. Atualize o token na configuração da conexão.');
      }

      throw Error('Erro ao listar templates');
    }
  }

  async createTemplate(
    wabaId: string,
    token: string,
    data: { name: string; language: string; category: string; components: any[] },
  ) {
    try {
      const result = await axios.post(
        `${this.urlMeta}/${wabaId}/message_templates`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        },
      );

      return result.data;
    } catch (error: any) {
      const detail = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error?.message || String(error);
      this.logger.error(`createTemplate - ${detail}`);

      const metaError = error?.response?.data?.error;
      if (
        error?.response?.status === 401 ||
        metaError?.code === 190 ||
        metaError?.type === 'OAuthException'
      ) {
        throw Error('TOKEN_EXPIRED: O token de acesso da Meta expirou ou é inválido. Atualize o token na configuração da conexão.');
      }

      throw Error(metaError?.message || 'Erro ao criar o template');
    }
  }

  async deleteTemplate(wabaId: string, token: string, templateName: string) {
    try {
      const result = await axios.delete(
        `${this.urlMeta}/${wabaId}/message_templates?name=${templateName}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        },
      );

      return result.data;
    } catch (error: any) {
      const detail = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error?.message || String(error);
      this.logger.error(`deleteTemplate - ${detail}`);

      const metaError = error?.response?.data?.error;
      if (
        error?.response?.status === 401 ||
        metaError?.code === 190 ||
        metaError?.type === 'OAuthException'
      ) {
        throw Error('TOKEN_EXPIRED: O token de acesso da Meta expirou ou é inválido. Atualize o token na configuração da conexão.');
      }

      throw Error(metaError?.message || 'Erro ao deletar o template');
    }
  }

  async sendReadMessage(
    numberId: string,
    token: string,
    data: IBodyReadMessage,
  ) {
    try {
      this.logger.log(`sendReadMessage - ${JSON.stringify(data)}`);

      const result = await axios.post(
        `${this.urlMeta}/${numberId}/messages`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        },
      );

      return result.data as IResultTemplates;
    } catch (error: any) {
      const detail = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error?.message || String(error);
      this.logger.error(`sendReadMessage - ${detail}`);
      throw Error('Erro ao marcar a mensagem como lida');
    }
  }
}
