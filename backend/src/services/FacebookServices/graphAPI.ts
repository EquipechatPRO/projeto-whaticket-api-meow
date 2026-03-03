import axios from "axios";
import FormData from "form-data";
import { createReadStream } from "fs";
import logger from "../../utils/logger";
import { isNil } from "lodash";
const formData: FormData = new FormData();

const apiBase = (token: string) =>
  axios.create({
    baseURL: "https://graph.facebook.com/v20.0/",
    params: {
      access_token: token
    }
  });

export const getAccessToken = async (): Promise<string> => {
  const { data } = await axios.get(
    "https://graph.facebook.com/v20.0/oauth/access_token",
    {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        grant_type: "client_credentials"
      }
    }
  );

  return data.access_token;
};

export const markSeen = async (id: string, token: string): Promise<void> => {
  await apiBase(token).post(`${id}/messages`, {
    recipient: {
      id
    },
    sender_action: "mark_seen"
  });
};

export const showTypingIndicator = async (
  id: string, 
  token: string,
  action: string
): Promise<void> => {

  try {
    const { data } = await apiBase(token).post("me/messages", {
      recipient: {
        id: id
      },
      sender_action: action
    })

    return data;
  } catch (error) {
    //console.log(error);
  }

}

// ✅ NOVO: Função para obter informações do comentário e extrair PSID do usuário
export const getCommentInfo = async (
  commentId: string,
  token: string
): Promise<any> => {
  try {
    // ✅ CORRIGIDO: Tentar diferentes formatos do commentId
    // O commentId do webhook pode vir como post_id_comment_id
    // Mas a API pode precisar apenas do comment_id ou do formato completo
    
    let finalCommentId = commentId;
    
    // Se o commentId contém underscore, pode ser post_id_comment_id
    // Tentar primeiro com o formato completo
    if (commentId.includes('_')) {
      const parts = commentId.split('_');
      // Se tiver mais de 2 partes, pode ser post_id_comment_id
      // Tentar usar apenas a última parte (comment_id puro)
      if (parts.length >= 2) {
        const alternativeId = parts[parts.length - 1];
        console.log(`[FACEBOOK] 🔍 Tentando buscar comentário com ID alternativo: ${alternativeId}`);
        try {
          const { data } = await apiBase(token).get(
            `${alternativeId}?fields=id,from{id,name},message,created_time`
          );
          if (data && data.id) {
            console.log(`[FACEBOOK] ✅ Comentário encontrado com ID alternativo: ${data.id}`);
            return data;
          }
        } catch (altError: any) {
          console.log(`[FACEBOOK] ⚠️ Não foi possível buscar com ID alternativo, tentando formato completo`);
        }
      }
    }
    
    // Tentar com o formato completo
    console.log(`[FACEBOOK] 🔍 Tentando buscar comentário com ID completo: ${finalCommentId}`);
    const { data } = await apiBase(token).get(
      `${finalCommentId}?fields=id,from{id,name},message,created_time`
    );
    
    if (data && data.id) {
      console.log(`[FACEBOOK] ✅ Comentário encontrado: ${data.id}`);
    }
    
    return data;
  } catch (error: any) {
    const errorData = error?.response?.data || {};
    console.error(`[FACEBOOK] ❌ Erro ao buscar informações do comentário ${commentId}:`);
    console.error(`[FACEBOOK] - Código: ${errorData?.error?.code}`);
    console.error(`[FACEBOOK] - Mensagem: ${errorData?.error?.message || error.message}`);
    return null;
  }
};

// ✅ NOVO: Função para enviar mensagem privada (Private Reply) para um comentário do Facebook
// Esta é a forma correta de enviar mensagens diretas para usuários que comentaram
// Documentação: https://developers.facebook.com/docs/graph-api/reference/comment/private_replies
export const sendPrivateReplyToComment = async (
  commentId: string,
  message: string,
  token: string
): Promise<any> => {
  try {
    console.log(`[FACEBOOK] 🔄 Tentando enviar Private Reply para comentário: ${commentId}`);
    
    // ✅ NOVO: Primeiro, verificar se o comentário existe e obter o ID correto
    // Isso ajuda a identificar se o problema é formato ou permissões
    let commentInfo = null;
    let finalCommentId = commentId;
    
    try {
      commentInfo = await getCommentInfo(commentId, token);
      if (commentInfo && commentInfo.id) {
        // ✅ CORRIGIDO: Usar o ID retornado pela API (formato correto)
        finalCommentId = commentInfo.id;
        console.log(`[FACEBOOK] ✅ Comentário encontrado, usando ID da API: ${finalCommentId}`);
      } else {
        console.warn(`[FACEBOOK] ⚠️ Não foi possível obter informações do comentário ${commentId}`);
        console.warn(`[FACEBOOK] ⚠️ Tentando usar o ID do webhook diretamente: ${finalCommentId}`);
      }
    } catch (infoError: any) {
      const infoErrorData = infoError?.response?.data || {};
      console.warn(`[FACEBOOK] ⚠️ Erro ao buscar informações do comentário (continuando mesmo assim):`);
      console.warn(`[FACEBOOK] - Código: ${infoErrorData?.error?.code}`);
      console.warn(`[FACEBOOK] - Mensagem: ${infoErrorData?.error?.message || infoError.message}`);
      console.warn(`[FACEBOOK] ⚠️ Tentando usar o ID do webhook diretamente: ${finalCommentId}`);
    }
    
    // ✅ CORRIGIDO: Tentar enviar Private Reply com o ID correto
    console.log(`[FACEBOOK] 📋 Tentando enviar Private Reply para comentário: ${finalCommentId}`);
    console.log(`[FACEBOOK] 📋 Endpoint: ${finalCommentId}/private_replies`);
    
    try {
      const { data } = await apiBase(token).post(`${finalCommentId}/private_replies`, {
        message: message
      });
      
      console.log(`[FACEBOOK] ✅ Private Reply enviada com sucesso para comentário ${finalCommentId}`);
      console.log(`[FACEBOOK] 📋 Resposta:`, JSON.stringify(data, null, 2));
      return data;
    } catch (privateReplyError: any) {
      const privateReplyErrorData = privateReplyError?.response?.data || {};
      console.error(`[FACEBOOK] ❌ Erro ao enviar Private Reply para ${finalCommentId}:`);
      console.error(`[FACEBOOK] - Código: ${privateReplyErrorData?.error?.code}`);
      console.error(`[FACEBOOK] - Subcode: ${privateReplyErrorData?.error?.error_subcode}`);
      console.error(`[FACEBOOK] - Mensagem: ${privateReplyErrorData?.error?.message || privateReplyError.message}`);
      console.error(`[FACEBOOK] - Tipo: ${privateReplyErrorData?.error?.type}`);
      throw privateReplyError; // Re-lançar para ser capturado no catch externo
    }
  } catch (error: any) {
    const errorData = error?.response?.data || {};
    const errorCode = errorData?.error?.code;
    const errorMessage = errorData?.error?.message || error.message;
    const errorSubcode = errorData?.error?.error_subcode;
    
    console.error(`[FACEBOOK] ❌ Erro ao enviar Private Reply para comentário ${commentId}:`);
    console.error(`[FACEBOOK] - Código: ${errorCode}`);
    console.error(`[FACEBOOK] - Subcode: ${errorSubcode}`);
    console.error(`[FACEBOOK] - Mensagem: ${errorMessage}`);
    
    // ✅ NOVO: Se o erro for 100 (objeto não existe), tentar formatos alternativos
    if (errorCode === 100 && commentId.includes('_')) {
      const parts = commentId.split('_');
      
      // Tentar formato alternativo: Apenas a última parte (comment_id puro)
      // O formato do webhook é: post_id_comment_id
      // A API pode precisar apenas do comment_id
      if (parts.length >= 2) {
        const alternativeId = parts[parts.length - 1];
        console.log(`[FACEBOOK] 🔄 Tentativa 2: Usando apenas comment_id: ${alternativeId}`);
        try {
          const { data } = await apiBase(token).post(`${alternativeId}/private_replies`, {
            message: message
          });
          console.log(`[FACEBOOK] ✅ Private Reply enviada com formato alternativo: ${alternativeId}`);
          return data;
        } catch (altError: any) {
          const altErrorData = altError?.response?.data || {};
          console.error(`[FACEBOOK] ❌ Erro também com formato alternativo:`);
          console.error(`[FACEBOOK] - Código: ${altErrorData?.error?.code}`);
          console.error(`[FACEBOOK] - Mensagem: ${altErrorData?.error?.message || altError.message}`);
          console.error(`[FACEBOOK] ⚠️ A Private Reply API pode requerer:`);
          console.error(`[FACEBOOK] - Permissão 'pages_messaging' ou 'pages_manage_metadata'`);
          console.error(`[FACEBOOK] - O comentário deve existir e ser da página`);
          console.error(`[FACEBOOK] - A página deve ter Messenger habilitado`);
          console.error(`[FACEBOOK] - O comentário não pode ter sido removido`);
          console.error(`[FACEBOOK] - A página precisa estar publicada (não em modo rascunho)`);
        }
      }
    }
    
    return null;
  }
};

export const sendText = async (
  id: string | number,
  text: string,
  token: string,
  tag?: string | null,
  commentId?: string | null // ✅ NOVO: ID do comentário para usar Private Reply se Direct falhar
): Promise<any> => {
  try {
    console.log("tag SendText", tag)
    if (!isNil(tag)) {
      const { data } = await apiBase(token).post("me/messages", {
        recipient: {
          id
        },
        message: {
          text: `${text}`,
        },
        messaging_type: "MESSAGE_TAG",
        tag: tag
      });
      return data;
    } else {
      const { data } = await apiBase(token).post("me/messages", {
        recipient: {
          id
        },
        message: {
          text: `${text}`,
        },
      });
      return data;
    }
  } catch (error: any) {
    logger.error(`ERR_SENDING_MESSAGE_TO_FACEBOOK_TRY_3: ${error}`);
    
    // ✅ CORRIGIDO: Log detalhado do erro para debug
    if (error?.response?.status === 400) {
      const errorMessage = error?.response?.data?.error?.message || "";
      const errorCode = error?.response?.data?.error?.code || "";
      console.error(`[FACEBOOK] ❌ Erro ao enviar mensagem direta:`);
      console.error(`[FACEBOOK] - Código: ${errorCode}`);
      console.error(`[FACEBOOK] - Mensagem: ${errorMessage}`);
      console.error(`[FACEBOOK] - Recipient ID: ${id}`);
      console.error(`[FACEBOOK] - Tag: ${tag || 'nenhuma'}`);
      
      // ✅ NOVO: Se for erro 551 e tiver commentId, usar Private Reply (API correta para comentários)
      if ((errorMessage.includes("551") || errorMessage.includes("não está disponível")) && commentId) {
        console.log(`[FACEBOOK] ⚠️ ERRO 551: Tentando usar Private Reply API para comentário ${commentId}`);
        console.log(`[FACEBOOK] 📋 CommentId recebido: ${commentId}`);
        
        try {
          console.log(`[FACEBOOK] 🔄 Chamando sendPrivateReplyToComment com commentId: ${commentId}`);
          const privateReply = await sendPrivateReplyToComment(commentId, text, token);
          
          if (privateReply) {
            console.log(`[FACEBOOK] ✅ Mensagem enviada via Private Reply (Direct do contato)`);
            console.log(`[FACEBOOK] 📋 Resposta da Private Reply:`, JSON.stringify(privateReply, null, 2));
            // Retornar um objeto similar ao que seria retornado pela API de mensagens
            return {
              message_id: privateReply.id || `private-reply-${Date.now()}`,
              id: privateReply.id,
              recipient_id: id,
              private_reply: true // Flag para indicar que foi enviado via Private Reply
            };
          } else {
            console.error(`[FACEBOOK] ❌ Private Reply retornou null - não foi possível enviar`);
            console.error(`[FACEBOOK] ⚠️ Possíveis causas:`);
            console.error(`[FACEBOOK] - Comment ID pode estar no formato incorreto`);
            console.error(`[FACEBOOK] - Página pode não ter permissões para Private Replies`);
            console.error(`[FACEBOOK] - Comentário pode não existir ou ter sido removido`);
            console.error(`[FACEBOOK] - Usuário pode ter bloqueado mensagens da página`);
          }
        } catch (privateReplyError: any) {
          const privateReplyErrorData = privateReplyError?.response?.data || {};
          console.error(`[FACEBOOK] ❌ Exceção ao enviar Private Reply:`);
          console.error(`[FACEBOOK] - Código: ${privateReplyErrorData?.error?.code}`);
          console.error(`[FACEBOOK] - Subcode: ${privateReplyErrorData?.error?.error_subcode}`);
          console.error(`[FACEBOOK] - Mensagem: ${privateReplyErrorData?.error?.message || privateReplyError.message}`);
          console.error(`[FACEBOOK] - Tipo: ${privateReplyErrorData?.error?.type}`);
          console.error(`[FACEBOOK] ⚠️ Possíveis causas do erro 551:`);
          console.error(`[FACEBOOK] - ID do comentário pode não ser válido`);
          console.error(`[FACEBOOK] - Usuário pode ter bloqueado a página ou ter restrições no Messenger`);
          console.error(`[FACEBOOK] - Tag ACCOUNT_UPDATE pode não estar sendo aceita`);
          console.error(`[FACEBOOK] - Usuário pode não ter permitido mensagens da página`);
          console.error(`[FACEBOOK] - A Private Reply API pode não estar disponível para este tipo de comentário`);
        }
      }
    }
    
    try {
      if (!isNil(tag)) {
        const { data } = await apiBase(token).post("me/messages", {
          recipient: {
          id
        },
        message: {
          text: `${text}`,
        },
        messaging_type: "MESSAGE_TAG",
        tag: tag
        });
        return data;
      } else {
        throw new Error("ERR_SENDING_MESSAGE_TO_FACEBOOK_TRY_3");
      }
    } catch (error) {
      console.log(error);
      throw error; // ✅ CORRIGIDO: Lançar erro para que o fluxo saiba que falhou
    }
  }
};

export const sendAttachmentFromUrl = async (
  id: string,
  url: string,
  type: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await apiBase(token).post("me/messages", {
      recipient: {
        id
      },
      message: {
        attachment: {
          type,
          payload: {
            url
          }
        }
      }
    });

    return data;
  } catch (error) {
    console.error(`[FACEBOOK] Erro ao enviar attachment (${type}):`, error);
    // ✅ CORRIGIDO: Retornar null em caso de erro para que o código possa tratar
    return null;
  }
};

export const sendAttachment = async (
  id: string,
  file: Express.Multer.File,
  type: string,
  token: string
): Promise<void> => {
  formData.append(
    "recipient",
    JSON.stringify({
      id
    })
  );

  formData.append(
    "message",
    JSON.stringify({
      attachment: {
        type,
        payload: {
          is_reusable: true
        }
      }
    })
  );

  const fileReaderStream = createReadStream(file.path);

  formData.append("filedata", fileReaderStream);

  try {
    await apiBase(token).post("me/messages", formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
  } catch (error) {
    throw new Error(error);
  }
};

export const genText = (text: string): any => {
  const response = {
    text
  };

  return response;
};

export const getProfile = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v20.0/${id}?fields=name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user&access_token=${token}`
    );
    return data;
  } catch (error) {
    console.log(error);
    throw new Error("ERR_FETCHING_FB_USER_PROFILE_2");
  }
};

export const getPageProfile = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(
      `${id}/accounts?fields=name,access_token,instagram_business_account{id,username,profile_picture_url,name}`
    );
    return data;
  } catch (error) {
    console.log(error);
    throw new Error("ERR_FETCHING_FB_PAGES");
  }
};

export const profilePsid = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v20.0/${id}?access_token=${token}`
    );
    return data;
  } catch (error) {
    await getProfile(id, token);
  }
};

// ✅ NOVO: Buscar informações do post do Facebook
export const getPostData = async (postId: string, token: string): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(
      `${postId}?fields=message,story,created_time,permalink_url,full_picture,picture,attachments{media{image{src}},subattachments{media{image{src}}}}`
    );
    return data;
  } catch (error) {
    console.error(`[FACEBOOK] Erro ao buscar dados do post ${postId}:`, error);
    return null;
  }
};

// ✅ NOVO: Buscar informações da mídia do Instagram
// Documentação: https://developers.facebook.com/docs/instagram-platform/comment-moderation
export const getInstagramMediaData = async (mediaId: string, token: string): Promise<any> => {
  try {
    // Instagram Graph API usa graph.instagram.com ou graph.facebook.com dependendo do tipo de login
    // Tentar primeiro com graph.facebook.com (Facebook Login for Business)
    const { data } = await apiBase(token).get(
      `${mediaId}?fields=id,caption,media_type,media_url,permalink,timestamp,username`
    );
    return data;
  } catch (error) {
    console.error(`[INSTAGRAM] Erro ao buscar dados da mídia ${mediaId}:`, error);
    // Tentar formato alternativo se o primeiro falhar
    try {
      const { data } = await axios.get(
        `https://graph.instagram.com/v20.0/${mediaId}?fields=id,caption,media_type,media_url,permalink,timestamp,username&access_token=${token}`
      );
      return data;
    } catch (error2) {
      console.error(`[INSTAGRAM] Erro ao buscar dados da mídia ${mediaId} (tentativa 2):`, error2);
      return null;
    }
  }
};

const DEFAULT_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_deliveries",
  "message_reads",
  "message_echoes",
  "message_reactions",
  "message_mention",
  "mention",
  "feed"
  // ❌ REMOVIDO: "comments" não é um campo válido para subscrição de webhooks do Facebook
  // Os comentários do Instagram chegam através do campo "feed" quando item === "comment"
];

// ✅ NOVO: Campos válidos para Instagram Business Account
// Documentação: https://developers.facebook.com/docs/instagram-platform/webhooks
const INSTAGRAM_SUBSCRIBED_FIELDS = [
  "messages",
  "comments", // ✅ CORRIGIDO: Para Instagram, "comments" é válido (não "feed")
  "mentions",
  "live_comments",
  "message_reactions",
  "messaging_postbacks",
  "messaging_optins",
  "messaging_referral",
  "messaging_seen"
];

export const subscribeApp = async (id: string, token: string, isInstagramAccount: boolean = false): Promise<any> => {
  try {
    // ✅ CORRIGIDO: Para Instagram Business Account, usar campos específicos do Instagram
    // Segundo documentação: https://developers.facebook.com/docs/instagram-platform/webhooks
    // Instagram Business Account tem campos diferentes do Facebook Page
    const fieldsToSubscribe = isInstagramAccount 
      ? INSTAGRAM_SUBSCRIBED_FIELDS // ✅ CORRIGIDO: Usar campos válidos para Instagram
      : DEFAULT_SUBSCRIBED_FIELDS;
    
    console.log(`[SUBSCRIBE] 🔔 Subscrição em ${isInstagramAccount ? 'Instagram Business Account' : 'Facebook Page'}: ${id}`);
    console.log(`[SUBSCRIBE] 📋 Campos:`, fieldsToSubscribe);
    
    const { data } = await axios.post(
      `https://graph.facebook.com/v20.0/${id}/subscribed_apps?access_token=${token}`,
      {
        subscribed_fields: fieldsToSubscribe
      }
    );
    
    console.log(`[SUBSCRIBE] ✅ Subscrição realizada com sucesso:`, data);
    return data;
  } catch (error: any) {
    const errorData = error?.response?.data || {};
    console.error(`[SUBSCRIBE] ❌ Erro ao subscrever:`, errorData);
    
    // ✅ CORRIGIDO: Para Instagram, comentários podem chegar via página vinculada
    // Mas tentar usar os campos corretos primeiro
    if (isInstagramAccount) {
      console.log(`[SUBSCRIBE] ⚠️ Subscrição no Instagram Business Account falhou`);
      console.log(`[SUBSCRIBE] ⚠️ Comentários do Instagram geralmente chegam via página do Facebook vinculada (campo "feed")`);
      console.log(`[SUBSCRIBE] ⚠️ Mas também podem chegar diretamente via Instagram Business Account (campo "comments")`);
      return null; // Não lançar erro, pois comentários podem chegar via página vinculada
    }
    throw new Error("ERR_SUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
  }
};

export const unsubscribeApp = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await axios.delete(
      `https://graph.facebook.com/v20.0/${id}/subscribed_apps?access_token=${token}`
    );
    return data;
  } catch (error) {
    throw new Error("ERR_UNSUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
  }
};

export const getSubscribedApps = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(`${id}/subscribed_apps`);
    return data;
  } catch (error) {
    throw new Error("ERR_GETTING_SUBSCRIBED_APPS");
  }
};

export const getAccessTokenFromPage = async (
  token: string
): Promise<string> => {
  try {

    if (!token) throw new Error("ERR_FETCHING_FB_USER_TOKEN");

    const data = await axios.get(
      "https://graph.facebook.com/v20.0/oauth/access_token",
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          grant_type: "fb_exchange_token",
          fb_exchange_token: token
        }
      }
    );

    return data.data.access_token;
  } catch (error) {
    console.log(error);
    throw new Error("ERR_FETCHING_FB_USER_TOKEN");
  }
};

export const removeApplcation = async (
  id: string,
  token: string
): Promise<void> => {
  try {
    await axios.delete(`https://graph.facebook.com/v20.0/${id}/permissions`, {
      params: {
        access_token: token
      }
    });
  } catch (error) {
    logger.error("ERR_REMOVING_APP_FROM_PAGE");
  }
};