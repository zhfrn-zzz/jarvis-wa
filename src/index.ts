import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  WAMessageKey,
  proto
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import { commandHandler } from './handlers/commandHandler';
import { DailyAnnouncementScheduler } from './schedulers/dailyAnnouncement';

dotenv.config();

class JarvisBot {
  private sock: any;
  private scheduler: DailyAnnouncementScheduler | null = null;

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
  }

  private async handleMessages(m: any): Promise<void> {
    const message = m.messages[0];
    
    if (!message.message || message.key.fromMe) return;

    const messageText = this.extractMessageText(message);
    if (!messageText || !messageText.startsWith('.')) return;

    const senderId = message.key.remoteJid;
    const isGroup = senderId?.endsWith('@g.us') || false;
    
    // For groups, use participant ID, for DMs use remoteJid
    const userId = isGroup ? message.key.participant : senderId;

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

    return null;
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