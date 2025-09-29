import { WAMessage, downloadMediaMessage } from '@whiskeysockets/baileys';
import { 
  processImageToSticker, 
  processVideoToSticker, 
  detectMediaType, 
  validateFileSize,
  StickerResult 
} from '../utils/stickerProcessor';

export interface StickerHandlerResult {
  success: boolean;
  stickerBuffer?: Buffer;
  isAnimated?: boolean;
  message: string;
}

/**
 * Handle sticker conversion from WhatsApp message
 */
export async function handleStickerCommand(
  message: WAMessage,
  quotedMessage?: WAMessage
): Promise<StickerHandlerResult> {
  try {
    console.log('[stickerHandler] Processing sticker command');

    // Determine which message contains the media
    const mediaMessage = quotedMessage || message;
    
    // Check if message has media
    const hasImage = mediaMessage.message?.imageMessage;
    const hasVideo = mediaMessage.message?.videoMessage;
    const hasDocument = mediaMessage.message?.documentMessage;

    if (!hasImage && !hasVideo && !hasDocument) {
      return {
        success: false,
        message: `❌ **Tidak ada media yang ditemukan!**

📝 **Cara Penggunaan:**
1. Kirim gambar dengan caption \`.sticker\`
2. Kirim video/GIF dengan caption \`.sticker\`
3. Reply gambar/video dengan \`.sticker\`

📋 **Format yang didukung:**
• Gambar: JPG, PNG, WEBP (maks 1MB)
• Video: MP4, GIF (maks 2MB, 7 detik)`
      };
    }

    // Download media
    console.log('[stickerHandler] Downloading media...');
    const mediaBuffer = await downloadMediaMessage(
      mediaMessage,
      'buffer',
      {},
      {
        logger: console as any,
        reuploadRequest: () => Promise.resolve({} as any)
      }
    ) as Buffer;

    if (!mediaBuffer || mediaBuffer.length === 0) {
      return {
        success: false,
        message: '❌ Gagal mengunduh media. Silakan coba lagi.'
      };
    }

    console.log(`[stickerHandler] Media downloaded, size: ${mediaBuffer.length} bytes`);

    // Detect media type
    const mediaType = detectMediaType(mediaBuffer);
    
    if (mediaType === 'unknown') {
      return {
        success: false,
        message: `❌ **Format media tidak didukung!**

📋 **Format yang didukung:**
• Gambar: JPG, PNG, WEBP
• Video: MP4, GIF

Silakan kirim media dengan format yang benar.`
      };
    }

    // Validate file size
    const sizeValidation = validateFileSize(mediaBuffer, mediaType);
    if (!sizeValidation.valid) {
      return {
        success: false,
        message: `❌ ${sizeValidation.error}`
      };
    }

    // Process media to sticker
    console.log(`[stickerHandler] Processing ${mediaType} to sticker...`);
    
    let result: StickerResult;
    
    if (mediaType === 'image') {
      result = await processImageToSticker(mediaBuffer, { quality: 80 });
    } else {
      result = await processVideoToSticker(mediaBuffer, { 
        quality: 80, 
        maxDuration: 7 
      });
    }

    if (!result.success) {
      return {
        success: false,
        message: `❌ Gagal memproses ${mediaType === 'image' ? 'gambar' : 'video'}: ${result.error}`
      };
    }

    if (!result.buffer) {
      return {
        success: false,
        message: '❌ Gagal menghasilkan stiker. Silakan coba lagi.'
      };
    }

    console.log(`[stickerHandler] Sticker created successfully, animated: ${result.isAnimated}`);

    return {
      success: true,
      stickerBuffer: result.buffer,
      isAnimated: result.isAnimated,
      message: `✅ Stiker ${result.isAnimated ? 'bergerak' : 'statis'} berhasil dibuat!`
    };

  } catch (error) {
    console.error('[stickerHandler] Error processing sticker:', error);
    
    return {
      success: false,
      message: `❌ Terjadi kesalahan saat memproses stiker: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if message is a sticker command
 */
export function isStickerCommand(messageText: string): boolean {
  const text = messageText.toLowerCase().trim();
  return text === '.sticker' || text === '.s' || text === '.stiker';
}

/**
 * Extract media info for logging
 */
export function getMediaInfo(message: WAMessage): {
  hasMedia: boolean;
  mediaType?: string;
  fileSize?: number;
  duration?: number;
} {
  const imageMsg = message.message?.imageMessage;
  const videoMsg = message.message?.videoMessage;
  const docMsg = message.message?.documentMessage;

  if (imageMsg) {
    return {
      hasMedia: true,
      mediaType: 'image',
      fileSize: imageMsg.fileLength ? Number(imageMsg.fileLength) : undefined
    };
  }

  if (videoMsg) {
    return {
      hasMedia: true,
      mediaType: 'video',
      fileSize: videoMsg.fileLength ? Number(videoMsg.fileLength) : undefined,
      duration: videoMsg.seconds || undefined
    };
  }

  if (docMsg) {
    return {
      hasMedia: true,
      mediaType: 'document',
      fileSize: docMsg.fileLength ? Number(docMsg.fileLength) : undefined
    };
  }

  return { hasMedia: false };
}