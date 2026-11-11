import { WASocket } from '@whiskeysockets/baileys';
import pino from 'pino';

const logger = pino({ level: 'info' });

export interface QueuedMessage {
  id: string;
  to: string;
  message: string;
  resolve: (value: { success: boolean; timestamp: number }) => void;
  reject: (reason: any) => void;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private isProcessing: boolean = false;
  private processedBatchCount: number = 0;
  private getSocket: () => WASocket | null;
  private isConnected: () => boolean;

  constructor(getSocket: () => WASocket | null, isConnected: () => boolean) {
    this.getSocket = getSocket;
    this.isConnected = isConnected;
  }

  public enqueue(to: string, message: string): Promise<{ success: boolean; timestamp: number }> {
    return new Promise((resolve, reject) => {
      const msg: QueuedMessage = {
        id: Math.random().toString(36).substring(2, 9),
        to,
        message,
        resolve,
        reject
      };
      this.queue.push(msg);
      this.processQueue();
    });
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const sock = this.getSocket();
      if (!sock || !this.isConnected()) {
        logger.warn('WhatsApp not connected. Waiting for reconnection...');
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      const item = this.queue.shift();
      if (!item) break;

      try {
        let jid = item.to.trim();
        if (!jid.includes('@')) {
          let cleanDigits = jid.replace(/[^0-9]/g, '');
          // If Romanian local format (07xxxxxxxx), normalize to international (407xxxxxxxx)
          if (cleanDigits.startsWith('0') && cleanDigits.length === 10) {
            cleanDigits = '40' + cleanDigits.substring(1);
          } else if (cleanDigits.startsWith('00')) {
            cleanDigits = cleanDigits.substring(2);
          }

          // Try checking WhatsApp registered JID
          try {
            const results = await sock.onWhatsApp(cleanDigits);
            const waUser = results && results.length > 0 ? results[0] : null;
            if (waUser && waUser.exists && waUser.jid) {
              jid = waUser.jid;
            } else {
              jid = `${cleanDigits}@s.whatsapp.net`;
            }
          } catch {
            jid = `${cleanDigits}@s.whatsapp.net`;
          }
        }

        // Anti-ban simulation: Typing presence
        try {
          await sock.sendPresenceUpdate('available');
          await sock.sendPresenceUpdate('composing', jid);
          const typingDuration = Math.floor(Math.random() * 2000) + 2000; // 2s - 4s
          await new Promise((r) => setTimeout(r, typingDuration));
          await sock.sendPresenceUpdate('paused', jid);
        } catch (presenceErr) {
          logger.warn({ err: presenceErr }, 'Presence simulation warning');
        }

        // Dispatch message
        await sock.sendMessage(jid, { text: item.message });
        const timestamp = Date.now();
        logger.info({ jid, id: item.id }, 'WhatsApp message dispatched successfully');
        item.resolve({ success: true, timestamp });

        this.processedBatchCount++;

        // Batch cooldown after every 10 messages: 30s pause
        if (this.processedBatchCount >= 10 && this.queue.length > 0) {
          logger.info('Batch cooldown active: pausing for 30s...');
          this.processedBatchCount = 0;
          await new Promise((r) => setTimeout(r, 30000));
        } else if (this.queue.length > 0) {
          // Jitter delay between messages: 4s - 12s
          const jitterDelay = Math.floor(Math.random() * 8000) + 4000;
          await new Promise((r) => setTimeout(r, jitterDelay));
        }
      } catch (err: any) {
        logger.error({ err, item }, 'Failed to send WhatsApp message from queue');
        item.reject(err);
      }
    }

    this.isProcessing = false;
  }
}
