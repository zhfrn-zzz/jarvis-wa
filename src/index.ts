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
import axios from 'axios';
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

    // Handle tophoto command specially (requires quoted sticker processing)
    if (messageText && this.isToPhotoCommand(messageText)) {
      await this.handleToPhotoCommand(message, senderId);
      return;
    }

    // Handle regular text commands
    if (!messageText || !messageText.startsWith('.')) return;

    try {
      const response = await commandHandler.handleMessage(messageText, userId, isGroup, message);

      if (response) {
        // Check if this is a download request
        if (response.startsWith('__DOWNLOAD_REQUEST__')) {
          await this.handleDownloadCommand(response, senderId);
        } else {
          await this.sock.sendMessage(senderId, { text: response });
        }
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

  private isToPhotoCommand(messageText: string): boolean {
    const text = messageText.toLowerCase().trim();
    return text === '.tophoto' || text === '.toimg';
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

  private async handleToPhotoCommand(message: any, senderId: string): Promise<void> {
    try {
      console.log('[JarvisBot] Processing tophoto command');

      // Check for quoted message (reply)
      const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      let quotedMessageObj = undefined;

      if (quotedMessage) {
        quotedMessageObj = {
          key: { id: 'quoted' }, // Mock key for quoted message
          message: quotedMessage
        } as any;
      }

      // Import tophoto handler
      const { handleToPhotoCommand } = await import('./handlers/tophotoHandler');
      const result = await handleToPhotoCommand(message, quotedMessageObj);

      if (result.success && result.imageBuffer) {
        console.log(`[JarvisBot] Sticker to photo conversion successful, animated: ${result.isAnimated}`);

        // Send image as photo
        await this.sock.sendMessage(senderId, {
          image: result.imageBuffer,
          caption: `✅ *Stiker ${result.isAnimated ? 'animasi' : 'statis'} berhasil dikonversi menjadi gambar!*`
        });
      } else {
        console.log('[JarvisBot] Sticker to photo conversion failed:', result.message);
        await this.sock.sendMessage(senderId, { text: result.message });
      }

    } catch (error) {
      console.error('[JarvisBot] Error in tophoto command:', error);
      await this.sock.sendMessage(senderId, {
        text: '❌ Terjadi kesalahan saat memproses tophoto command.'
      });
    }
  }

  private validateMP4File(buffer: Buffer): boolean {
    // Check for common MP4 file signatures
    const signatures = [
      Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]), // ftyp box
      Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]), // ftyp box
      Buffer.from([0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]), // ftyp box
      Buffer.from([0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70]), // ftyp box
      Buffer.from([0x00, 0x00, 0x00, 0x0C, 0x6D, 0x6F, 0x6F, 0x76]), // moov box (movie)
      Buffer.from([0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65]), // free box
    ];

    // Check first 1KB for MP4 signatures
    const checkBuffer = buffer.slice(0, Math.min(1024, buffer.length));

    return signatures.some(sig => {
      return checkBuffer.includes(sig);
    });
  }

  private async tryAlternativeFormats(medias: any[], senderId: string, videoCaption: string, isYouTube: boolean): Promise<void> {
    try {
      // Try different formats in order of preference
      const formatsToTry = [
        { ext: 'mp4', quality: ['480p', '360p'] },
        { ext: 'webm', quality: ['720p', '480p', '360p'] },
        { ext: 'mkv', quality: ['480p', '360p'] },
        { ext: 'avi', quality: ['480p', '360p'] }
      ];

      for (const format of formatsToTry) {
        for (const quality of format.quality) {
          const alternativeMedia = medias.find((media: any) =>
            media.type === 'video' &&
            media.ext === format.ext &&
            media.quality &&
            media.quality.includes(quality)
          );

          if (alternativeMedia) {
            console.log(`[JarvisBot] Trying alternative: ${format.ext} ${quality}`);

            try {
              const response = await axios.get(alternativeMedia.url, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });

              const buffer = Buffer.from(response.data);

              // Validate buffer
              if (buffer.length > 100) {
                await this.sock.sendMessage(senderId, {
                  video: buffer,
                  mimetype: format.ext === 'webm' ? 'video/webm' : 'video/mp4',
                  fileName: `downloaded_video.${format.ext}`,
                  caption: `${videoCaption} (${format.ext.toUpperCase()} ${quality})`
                });

                console.log(`[JarvisBot] Successfully sent alternative format: ${format.ext} ${quality}`);
                return;
              }
            } catch (error) {
              console.log(`[JarvisBot] Failed alternative ${format.ext} ${quality}:`, error);
              continue;
            }
          }
        }
      }

      // If all formats fail, suggest manual download
      await this.sock.sendMessage(senderId, {
        text: `❌ Tidak dapat mengirim video ke WhatsApp. Format tidak didukung.\n\n💡 *Solusi:*\n1. Download manual menggunakan link yang tersedia\n2. Gunakan converter video online\n3. Pilih video dengan durasi lebih pendek`
      });

    } catch (error) {
      console.error('[JarvisBot] Error in tryAlternativeFormats:', error);
      await this.sock.sendMessage(senderId, {
        text: '❌ Gagal mencoba format alternatif.'
      });
    }
  }

  private async handleDownloadCommand(response: string, senderId: string): Promise<void> {
    try {
      console.log('[JarvisBot] Processing download command');

      // Parse the download request: __DOWNLOAD_REQUEST__{format}__{url}__{senderId}
      const parts = response.split('__');
      if (parts.length !== 5) {
        await this.sock.sendMessage(senderId, { text: '❌ Format request download tidak valid.' });
        return;
      }

      const format = parts[2];
      const url = parts[3];
      const requestSenderId = parts[4];

      // Initialize variables
      let videoCaption = '✅ Video berhasil didownload!';
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

      console.log(`[JarvisBot] Download request: format=${format}, url=${url}`);

      // Send processing message
      await this.sock.sendMessage(senderId, { text: '⏳ Memproses...' });

      // Get API credentials
      const rapidApiKey = process.env.RAPIDAPI_KEY;
      const rapidApiHost = process.env.RAPIDAPI_HOST || 'social-download-all-in-one.p.rapidapi.com';

      if (!rapidApiKey) {
        await this.sock.sendMessage(senderId, { text: '❌ Konfigurasi API tidak lengkap.' });
        return;
      }

      // Make API request to RapidAPI
      console.log('[JarvisBot] Making API request to RapidAPI...');

      const apiResponse = await axios.post(
        `https://${rapidApiHost}/v1/social/autolink`,
        { url: url },
        {
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': rapidApiHost,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      console.log('[JarvisBot] API response received');
      console.log('[JarvisBot] API response data:', JSON.stringify(apiResponse.data, null, 2));

      // Check if response has medias array
      if (!apiResponse.data || !apiResponse.data.medias || !Array.isArray(apiResponse.data.medias) || apiResponse.data.medias.length === 0) {
        console.log('[JarvisBot] No medias found in API response');
        await this.sock.sendMessage(senderId, { text: '❌ Tidak dapat menemukan media dari URL tersebut. Pastikan URL valid dan platform didukung.' });
        return;
      }

      const medias = apiResponse.data.medias;
      let selectedMedia = null;

      // Find appropriate media based on format
      if (format === 'mp3') {
        // Look for audio media - prefer higher quality audio
        selectedMedia = medias.find((media: any) => media.type === 'audio' && media.quality && media.quality.includes('131kb/s'));
        if (!selectedMedia) {
          selectedMedia = medias.find((media: any) => media.type === 'audio');
        }
      } else {
        // Look for video media (mp4 or default)
        // Prefer 720p for better compatibility with WhatsApp size limits
        selectedMedia = medias.find((media: any) =>
          media.type === 'video' &&
          media.quality &&
          media.quality.includes('720p')
        );

        // If no 720p found, try 480p
        if (!selectedMedia) {
          selectedMedia = medias.find((media: any) =>
            media.type === 'video' &&
            media.quality &&
            media.quality.includes('480p')
          );
        }

        // If no 480p found, try 360p
        if (!selectedMedia) {
          selectedMedia = medias.find((media: any) =>
            media.type === 'video' &&
            media.quality &&
            media.quality.includes('360p')
          );
        }

        // If still no video found, use first video available
        if (!selectedMedia) {
          selectedMedia = medias.find((media: any) => media.type === 'video');
        }
      }

      if (!selectedMedia || !selectedMedia.url) {
        await this.sock.sendMessage(senderId, {
          text: `❌ Tidak dapat menemukan ${format === 'mp3' ? 'audio' : 'video'} dari URL tersebut. Coba URL lain atau platform berbeda.`
        });
        return;
      }

      console.log(`[JarvisBot] Selected media:`, {
        type: selectedMedia.type,
        quality: selectedMedia.quality,
        formatId: selectedMedia.formatId,
        ext: selectedMedia.ext,
        url: selectedMedia.url.substring(0, 100) + '...' // Truncate URL for logging
      });

      // Download the file
      console.log('[JarvisBot] Downloading file...');
      const fileResponse = await axios.get(selectedMedia.url, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds for download
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const fileBuffer = Buffer.from(fileResponse.data);
      console.log(`[JarvisBot] File downloaded, size: ${fileBuffer.length} bytes`);

      // Validate file buffer
      if (!fileBuffer || fileBuffer.length === 0) {
        await this.sock.sendMessage(senderId, { text: '❌ File yang didownload kosong atau rusak.' });
        return;
      }

      // Check if file is valid (basic validation)
      if (fileBuffer.length < 100) {
        await this.sock.sendMessage(senderId, { text: '❌ File yang didownload terlalu kecil atau tidak valid.' });
        return;
      }

      // Validate video file signature for MP4
      if (format === 'mp4') {
        const isValidMP4 = this.validateMP4File(fileBuffer);
        if (!isValidMP4) {
          console.log('[JarvisBot] Invalid MP4 file signature detected');
          await this.sock.sendMessage(senderId, {
            text: '⚠️ Format video tidak kompatibel dengan WhatsApp. Mencoba format alternatif...'
          });
          // Try to find alternative format or return error
          await this.tryAlternativeFormats(medias, senderId, videoCaption, isYouTube);
          return;
        }
      }

      // Send the file
      console.log(`[JarvisBot] Sending ${format === 'mp3' ? 'audio' : 'video'} file to WhatsApp...`);

      try {
        if (format === 'mp3') {
          // Send as audio
          console.log('[JarvisBot] Sending audio message...');
          await this.sock.sendMessage(senderId, {
            audio: fileBuffer,
            mimetype: 'audio/mpeg',
            fileName: `downloaded_audio.mp3`
          });
          console.log('[JarvisBot] Audio message sent successfully');
          await this.sock.sendMessage(senderId, { text: '✅ Audio berhasil didownload!' });
        } else {
          // Send as video
          console.log('[JarvisBot] Sending video message...');

          // Check file size limit (WhatsApp limit is around 2GB, but let's be safe with 100MB for videos)
          const maxVideoSize = 100 * 1024 * 1024; // 100MB
          let videoBuffer = fileBuffer;

          if (fileBuffer.length > maxVideoSize) {
            console.log(`[JarvisBot] Video file too large: ${fileBuffer.length} bytes, trying lower quality...`);

            // Try to find a smaller video format
            let smallerMedia = medias.find((media: any) =>
              media.type === 'video' &&
              media.quality &&
              (media.quality.includes('480p') || media.quality.includes('360p'))
            );

            if (smallerMedia) {
              console.log(`[JarvisBot] Found smaller video format: ${smallerMedia.quality}`);
              // Download the smaller version
              const smallerResponse = await axios.get(smallerMedia.url, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });

              videoBuffer = Buffer.from(smallerResponse.data);
              console.log(`[JarvisBot] Smaller video downloaded, size: ${videoBuffer.length} bytes`);
              videoCaption = '✅ Video berhasil didownload! (Kualitas lebih rendah untuk kompatibilitas)';
            } else {
              await this.sock.sendMessage(senderId, {
                text: '❌ File video terlalu besar untuk dikirim via WhatsApp. Coba video yang lebih pendek atau gunakan format MP3.'
              });
              return;
            }
          }

          // Try to send video, with fallback for YouTube

          try {
            // Enhanced MP4 sending with metadata
            console.log('[JarvisBot] Trying to send video as MP4...');

            const videoPayload: any = {
              video: videoBuffer,
              mimetype: 'video/mp4',
              fileName: `downloaded_video.mp4`,
              caption: videoCaption,
              jpegThumbnail: undefined // WhatsApp handles this automatically
            };

            // Add additional metadata for better compatibility
            if (videoBuffer.length > 1000000) { // If file > 1MB
              videoPayload.fileLength = videoBuffer.length;
            }

            await this.sock.sendMessage(senderId, videoPayload);
            console.log('[JarvisBot] Video sent successfully as MP4');
          } catch (mp4Error: any) {
            console.log('[JarvisBot] MP4 send failed:', mp4Error.message);

            // If MP4 fails, try alternative formats immediately
            console.log('[JarvisBot] Trying alternative formats due to MP4 failure...');
            await this.tryAlternativeFormats(medias, senderId, videoCaption, isYouTube);
            return;
          }
        }
      } catch (sendError: any) {
        console.error('[JarvisBot] Error sending file to WhatsApp:', sendError);
        console.error('[JarvisBot] Send error details:', {
          message: sendError.message,
          code: sendError.code,
          stack: sendError.stack,
          name: sendError.name
        });

        // Try to provide more specific error messages
        let errorMessage = '❌ Gagal mengirim file.';
        if (sendError.message) {
          if (sendError.message.includes('file')) {
            errorMessage += ' File mungkin rusak atau format tidak didukung.';
          } else if (sendError.message.includes('size') || sendError.message.includes('large')) {
            errorMessage += ' File terlalu besar untuk WhatsApp.';
          } else if (sendError.message.includes('timeout')) {
            errorMessage += ' Timeout saat mengirim file.';
          } else {
            errorMessage += ` Error: ${sendError.message}`;
          }
        }

        await this.sock.sendMessage(senderId, { text: errorMessage });
        return;
      }

    } catch (error: any) {
      console.error('[JarvisBot] Error in download command:', error);
      console.error('[JarvisBot] Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });

      let errorMessage = '❌ Terjadi kesalahan saat mendownload.';

      if (error.code === 'ECONNABORTED') {
        errorMessage = '❌ Timeout: Proses download terlalu lama. Coba lagi nanti.';
      } else if (error.response) {
        console.error('[JarvisBot] API Error Response:', error.response.data);
        if (error.response.status === 429) {
          errorMessage = '❌ Terlalu banyak request. Coba lagi dalam beberapa menit.';
        } else if (error.response.status === 403) {
          errorMessage = '❌ Akses API ditolak. Periksa konfigurasi API.';
        } else if (error.response.status === 400) {
          errorMessage = '❌ URL tidak valid atau tidak didukung.';
        } else {
          errorMessage = `❌ Error API: ${error.response.status} - ${error.response.statusText || 'Unknown error'}`;
        }
      } else if (error.message) {
        errorMessage = `❌ Error: ${error.message}`;
      }

      await this.sock.sendMessage(senderId, { text: errorMessage });
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