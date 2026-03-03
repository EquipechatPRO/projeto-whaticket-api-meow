import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import {
  IReceivedWhatsppOficial,
  IReceivedWhatsppOficialRead,
} from 'src/@core/interfaces/IWebsocket.interface';

interface QueueItem {
  type: 'message' | 'read';
  data: IReceivedWhatsppOficial | IReceivedWhatsppOficialRead;
  timestamp: number;
}

interface CompanyQueue {
  items: QueueItem[];
  processing: boolean;
  socket: Socket | null;
  cleanupTimer: NodeJS.Timeout | null;
}

@Injectable()
export class SocketService implements OnModuleDestroy {
  private url: string;
  private companyQueues: Map<number, CompanyQueue> = new Map();
  private readonly DELAY_BETWEEN_MESSAGES = 200; // ms
  private readonly SOCKET_CLEANUP_DELAY = 5000; // ms - tempo para fechar socket após inatividade

  private logger: Logger = new Logger(`${SocketService.name}`);

  constructor() {}

  onModuleDestroy() {
    // Limpa todas as conexões ao destruir o módulo
    this.companyQueues.forEach((queue, companyId) => {
      if (queue.cleanupTimer) {
        clearTimeout(queue.cleanupTimer);
      }
      if (queue.socket) {
        this.logger.warn(`Fechando socket da empresa ${companyId} ao destruir módulo`);
        queue.socket.close();
      }
    });
    this.companyQueues.clear();
  }

  private getOrCreateQueue(companyId: number): CompanyQueue {
    if (!this.companyQueues.has(companyId)) {
      this.companyQueues.set(companyId, {
        items: [],
        processing: false,
        socket: null,
        cleanupTimer: null,
      });
    }
    return this.companyQueues.get(companyId)!;
  }

  private async getOrCreateSocket(companyId: number): Promise<Socket> {
    try {
      this.url = process.env.URL_BACKEND_MULT100;

      if (!this.url) throw new Error('Nenhuma configuração do url do backend');

      const queue = this.getOrCreateQueue(companyId);

      // Cancela cleanup agendado já que há atividade
      if (queue.cleanupTimer) {
        this.logger.log(`Cancelando cleanup agendado para empresa ${companyId} - nova atividade detectada`);
        clearTimeout(queue.cleanupTimer);
        queue.cleanupTimer = null;
      }

      // Se já existe um socket ativo, reutiliza
      if (queue.socket && queue.socket.connected) {
        this.logger.log(`Reutilizando socket conectado para empresa ${companyId}`);
        return queue.socket;
      }

      // Se existe socket mas não está conectado, remove
      if (queue.socket && !queue.socket.connected) {
        this.logger.warn(`Socket desconectado encontrado para empresa ${companyId}, criando novo...`);
        queue.socket.close();
        queue.socket = null;
      }

      // Cria novo socket
      this.logger.log(`Criando novo socket para empresa ${companyId}`);
      const socket = io(`${this.url}/${companyId}`, {
        query: {
          token: `Bearer ${process.env.TOKEN_ADMIN || ''}`,
        },
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      this.setupSocketEvents(socket, companyId);
      queue.socket = socket;

      // Aguardar conexão do socket
      await this.waitForConnection(socket, companyId);

      return socket;
    } catch (error: any) {
      this.logger.error(
        `Erro ao conectar com o websocket da API Mult100 - ${error.message}`,
      );
      throw error;
    }
  }

  private waitForConnection(socket: Socket, companyId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Se já está conectado, resolve imediatamente
      if (socket.connected) {
        this.logger.log(`Socket já conectado para empresa ${companyId}`);
        resolve();
        return;
      }

      // Timeout de 5 segundos para conexão
      const timeout = setTimeout(() => {
        this.logger.error(`Timeout ao conectar socket da empresa ${companyId}`);
        reject(new Error('Timeout ao conectar socket'));
      }, 5000);

      // Listener temporário para conexão
      socket.once('connect', () => {
        clearTimeout(timeout);
        this.logger.log(`Socket conectado com sucesso para empresa ${companyId}`);
        resolve();
      });

      // Listener temporário para erro
      socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        this.logger.error(`Erro ao conectar socket da empresa ${companyId}: ${error}`);
        reject(error);
      });
    });
  }

  sendMessage(data: IReceivedWhatsppOficial) {
    const companyId = data.companyId;
    const queue = this.getOrCreateQueue(companyId);

    // Cancela cleanup agendado já que há nova atividade
    if (queue.cleanupTimer) {
      clearTimeout(queue.cleanupTimer);
      queue.cleanupTimer = null;
    }

    // Adiciona mensagem na fila
    queue.items.push({
      type: 'message',
      data,
      timestamp: Date.now(),
    });

    this.logger.log(
      `📥 Mensagem adicionada à fila da empresa ${companyId}. Total na fila: ${queue.items.length}`,
    );

    // Inicia processamento se não estiver processando
    if (!queue.processing) {
      this.processQueue(companyId);
    }
  }

  readMessage(data: IReceivedWhatsppOficialRead) {
    const companyId = data.companyId;
    const queue = this.getOrCreateQueue(companyId);

    // Cancela cleanup agendado já que há nova atividade
    if (queue.cleanupTimer) {
      clearTimeout(queue.cleanupTimer);
      queue.cleanupTimer = null;
    }

    // Adiciona mensagem na fila
    queue.items.push({
      type: 'read',
      data,
      timestamp: Date.now(),
    });

    this.logger.log(
      `📖 Evento de leitura adicionado à fila da empresa ${companyId}. Total na fila: ${queue.items.length}`,
    );

    // Inicia processamento se não estiver processando
    if (!queue.processing) {
      this.processQueue(companyId);
    }
  }

  private async processQueue(companyId: number): Promise<void> {
    const queue = this.getOrCreateQueue(companyId);

    // Marca como processando
    queue.processing = true;

    try {
      // Garante que o socket está conectado e aguarda a conexão
      this.logger.log(`🔄 Iniciando processamento da fila para empresa ${companyId}`);
      const socket = await this.getOrCreateSocket(companyId);

      let processedCount = 0;

      while (queue.items.length > 0) {
        const item = queue.items.shift();

        if (!item) break;

        try {
          // Verifica se o socket ainda está conectado antes de emitir
          if (!socket.connected) {
            this.logger.error(`❌ Socket desconectado ao processar mensagem da empresa ${companyId}, reconectando...`);
            // Tenta reconectar
            await this.waitForConnection(socket, companyId);
          }

          if (item.type === 'message') {
            const data = item.data as IReceivedWhatsppOficial;
            
            this.logger.warn(
              `📤 [${processedCount + 1}] Enviando mensagem para o websocket da empresa ${companyId}`,
            );

            console.log('data', JSON.stringify(data, null, 2));

            socket.emit('receivedMessageWhatsAppOficial', data);
            
            this.logger.log(`✅ Mensagem emitida com sucesso para empresa ${companyId}`);
          } else if (item.type === 'read') {
            const data = item.data as IReceivedWhatsppOficialRead;

            this.logger.warn(
              `📤 [${processedCount + 1}] Enviando evento de leitura para o websocket da empresa ${companyId}`,
            );

            socket.emit('readMessageWhatsAppOficial', data);
            
            this.logger.log(`✅ Evento de leitura emitido com sucesso para empresa ${companyId}`);
          }

          processedCount++;

          // Aguarda o delay antes de processar a próxima mensagem
          if (queue.items.length > 0) {
            this.logger.log(`⏳ Aguardando ${this.DELAY_BETWEEN_MESSAGES}ms antes da próxima mensagem...`);
            await this.delay(this.DELAY_BETWEEN_MESSAGES);
          }
        } catch (error: any) {
          this.logger.error(
            `❌ Erro ao processar item da fila da empresa ${companyId}: ${error.message}`,
          );
        }
      }

      this.logger.log(`✨ Processamento concluído! ${processedCount} mensagens enviadas para empresa ${companyId}`);

      // Agenda o cleanup do socket após inatividade
      this.scheduleSocketCleanup(companyId);
    } catch (error: any) {
      this.logger.error(
        `❌ Erro ao processar fila da empresa ${companyId}: ${error.message}`,
      );
    } finally {
      queue.processing = false;
    }
  }

  private scheduleSocketCleanup(companyId: number): void {
    const queue = this.getOrCreateQueue(companyId);

    // Cancela cleanup anterior se existir
    if (queue.cleanupTimer) {
      clearTimeout(queue.cleanupTimer);
    }

    // Agenda novo cleanup
    queue.cleanupTimer = setTimeout(() => {
      const currentQueue = this.getOrCreateQueue(companyId);

      // Se a fila ainda está vazia e não está processando, fecha o socket
      if (currentQueue.items.length === 0 && !currentQueue.processing && currentQueue.socket) {
        this.logger.warn(
          `🔌 Fechando socket da empresa ${companyId} por inatividade (${this.SOCKET_CLEANUP_DELAY}ms sem atividade)`,
        );
        currentQueue.socket.close();
        currentQueue.socket = null;
        currentQueue.cleanupTimer = null;
      }
    }, this.SOCKET_CLEANUP_DELAY);

    this.logger.log(`⏰ Cleanup agendado para empresa ${companyId} em ${this.SOCKET_CLEANUP_DELAY}ms`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private setupSocketEvents(socket: Socket, companyId: number): void {
    socket.on('connect', () => {
      this.logger.log(
        `Conectado ao websocket do servidor ${this.url}/${companyId}`,
      );
    });

    socket.on('connect_error', (error) => {
      this.logger.error(`Erro de conexão empresa ${companyId}: ${error}`);
    });

    socket.on('disconnect', () => {
      this.logger.warn(
        `Desconectado do websocket do servidor ${this.url}/${companyId}`,
      );
    });
  }
}
