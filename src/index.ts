import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  WAMessageKey,
  proto,
  downloadMediaMessage
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import { commandHandler } from './handlers/commandHandler';
import { DailyAnnouncementScheduler } from './schedulers/dailyAnnouncement';
import { BirthdayChecker } from './schedulers/birthdayChecker';
import { botManager } from './utils/botManager';

dotenv.config();

class JarvisBot {
  private sock: any;
  private scheduler: DailyAnnouncementScheduler | null = null;
  private birthdayChecker: BirthdayChecker | null = null;

  async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    this.sock = makeWASocket({
      auth: state,
      logger: require('pino')({ level: 'silent' })
    });

    this.sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('📱 Scan QR code below to connect WhatsApp:');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        
        if (shouldReconnect) {
          this.start();
        }
      } else if (connection === 'open') {
        console.log('✅ Jarvis Bot connected successfully!');
        // Store bot socket reference for commands that need it
        botManager.setBotSocket(this.sock);
        this.initializeSchedulers();
      }
    });

    this.sock.ev.on('creds.update', saveCreds);
    this.sock.ev.on('messages.upsert', this.handleMessages.bind(this));
  }

  private initializeSchedulers(): void {
    if (!this.scheduler) {
      this.scheduler = new DailyAnnouncementScheduler(this.sock);
      this.scheduler.start();
    }
    
    if (!this.birthdayChecker) {
      this.birthdayChecker = new BirthdayChecker(this.sock);
      this.birthdayChecker.start();
    }
  }

  private async handleMessages(m: any): Promise<void> {
    const message = m.messages[0];
    
    if (!message.message || message.key.fromMe) return;

    const messageText = this.extractMessageText(message);
    const senderId = message.key.remoteJid;
    const isGroup = senderId?.endsWith('@g.us') || false;
    
    // For groups, use participant ID, for DMs use remoteJid
    const userId = isGroup ? message.key.participant : senderId;

    // Handle sticker command specially (requires media processing)
    if (messageText && this.isStickerCommand(messageText)) {
      await this.handleStickerCommand(message, senderId);
      return;
    }

    // Handle regular text commands
    if (!messageText || !messageText.startsWith('.')) return;

    try {
      const response = await commandHandler.handleMessage(messageText, userId, isGroup);
      
      if (response) {
        await this.sock.sendMessage(senderId, { text: response });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      await this.sock.sendMessage(senderId, { 
        text: '❌ Terjadi kesalahan saat memproses pesan.' 
      });
    }
  }

  private extractMessageText(message: any): string | null {
    if (message.message?.conversation) {
      return message.message.conversation;
    }
    
    if (message.message?.extendedTextMessage?.text) {
      return message.message.extendedTextMessage.text;
    }

    // Check for image/video with caption
    if (message.message?.imageMessage?.caption) {
      return message.message.imageMessage.caption;
    }

    if (message.message?.videoMessage?.caption) {
      return message.message.videoMessage.caption;
    }

    return null;
  }

  private isStickerCommand(messageText: string): boolean {
    const text = messageText.toLowerCase().trim();
    return text === '.sticker' || text === '.s' || text === '.stiker';
  }

  private async handleStickerCommand(message: any, senderId: string): Promise<void> {
    try {
      console.log('[JarvisBot] Processing sticker command');

      // Check for quoted message (reply)
      const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      let quotedMessageObj = undefined;
      
      if (quotedMessage) {
        quotedMessageObj = {
          key: { id: 'quoted' }, // Mock key for quoted message
          message: quotedMessage
        } as any;
      }

      // Use simple sticker handler for detection and validation
      const { handleSimpleStickerCommand } = await import('./handlers/simpleStickerHandler');
      const result = await handleSimpleStickerCommand(message, quotedMessageObj);

      // Check if media was detected and try full processing
      if (result.mediaDetected) {
        try {
          console.log('[JarvisBot] Media detected, attempting full sticker processing...');
          
          // Import full sticker handler
          const { handleStickerCommand } = await import('./handlers/stickerHandler');
          const stickerResult = await handleStickerCommand(message, quotedMessageObj);

          if (stickerResult.success && stickerResult.stickerBuffer) {
            console.log(`[JarvisBot] Sticker processing successful, sending ${stickerResult.isAnimated ? 'animated' : 'static'} sticker...`);
            
            // Send sticker with proper parameters for animated stickers
            const stickerMessage: any = {
              sticker: stickerResult.stickerBuffer,
              mimetype: 'image/webp'
            };
            
            // Add animated flag for animated stickers
            if (stickerResult.isAnimated) {
              stickerMessage.isAnimated = true;
            }
            
            await this.sock.sendMessage(senderId, stickerMessage);
            
            // Send success message
            await this.sock.sendMessage(senderId, { 
              text: `✅ *Stiker ${stickerResult.isAnimated ? 'bergerak' : 'statis'} berhasil dibuat!*` 
            });
          } else {
            console.log('[JarvisBot] Sticker processing failed:', stickerResult.message);
            await this.sock.sendMessage(senderId, { text: stickerResult.message });
          }
        } catch (processingError) {
          console.error('[JarvisBot] Sticker processing error:', processingError);
          await this.sock.sendMessage(senderId, {
            text: `❌ Gagal memproses sticker: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
          });
        }
      } else {
        // No media detected, send detection result message
        await this.sock.sendMessage(senderId, { text: result.message });
      }

    } catch (error) {
      console.error('[JarvisBot] Error in sticker command:', error);
      await this.sock.sendMessage(senderId, {
        text: '❌ Terjadi kesalahan saat memproses sticker command.'
      });
    }
  }
}

// Start the bot
const bot = new JarvisBot();
bot.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Jarvis Bot shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Jarvis Bot shutting down gracefully...');
  process.exit(0);
});