export interface IReceivedWhatsppOficial {
  token: string;
  fromNumber: string;
  nameContact: string;
  companyId: number;
  message: IMessageReceived;
}

export interface IReceivedWhatsppOficialRead {
  messageId: string;
  companyId: number;
  token: string;
}

export interface IMessageReceived {
  type:
    | 'text'
    | 'image'
    | 'audio'
    | 'document'
    | 'video'
    | 'location'
    | 'contacts'
    | 'order'
    | 'interactive'
    | 'referral'
    | 'sticker';
  timestamp: number;
  idMessage: string;
  text?: string;
  file?: string; // Base64 do arquivo (apenas para imagens, áudios pequenos)
  mimeType?: string;
  idFile?: string;
  quoteMessageId?: string;
  fileUrl?: string; // ✅ URL da Meta para download direto (para vídeos e documentos)
  fileSize?: number; // ✅ Tamanho do arquivo em bytes
}
