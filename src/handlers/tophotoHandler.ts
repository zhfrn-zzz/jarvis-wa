import { WAMessage, downloadMediaMessage } from '@whiskeysockets/baileys';
import sharp from 'sharp';

export interface ToPhotoHandlerResult {
  success: boolean;
  imageBuffer?: Buffer;
  isAnimated?: boolean;
  message: string;
}

/**
 * Handle sticker to photo conversion from WhatsApp message
 */
export async function handleToPhotoCommand(
  message: WAMessage,
  quotedMessage?: WAMessage
): Promise<ToPhotoHandlerResult> {
  try {
    console.log('[toPhotoHandler] Processing tophoto command');

    // Determine which message contains the sticker
    const stickerMessage = quotedMessage || message;
    
    // Check if the quoted message is a sticker
    const hasSticker = stickerMessage.message?.stickerMessage;

    if (!hasSticker) {
      return {
        success: false,
        message: `❌ *Reply sebuah stiker dengan perintah .tophoto untuk mengubahnya menjadi gambar.*

📝 *Cara Penggunaan:*
1. Tekan dan tahan stiker yang ingin dikonversi
2. Pilih "Reply" atau "Balas"
3. Ketik \`.tophoto\` atau \`.toimg\`
4. Kirim pesan

📋 *Format Output:*
• Format: JPG (kualitas tinggi)
• Stiker animasi akan dikonversi menjadi frame pertama`
      };
    }

    // Download sticker media
    console.log('[toPhotoHandler] Downloading sticker...');
    const stickerBuffer = await downloadMediaMessage(
      stickerMessage,
      'buffer',
      {},
      {
        logger: console as any,
        reuploadRequest: () => Promise.resolve({} as any)
      }
    ) as Buffer;

    if (!stickerBuffer || stickerBuffer.length === 0) {
      return {
        success: false,
        message: '❌ Gagal mengunduh stiker. Silakan coba lagi.'
      };
    }

    console.log(`[toPhotoHandler] Sticker downloaded, size: ${stickerBuffer.length} bytes`);

    // Check if sticker is animated
    const isAnimated = hasSticker.isAnimated || false;
    console.log(`[toPhotoHandler] Sticker is animated: ${isAnimated}`);

    try {
      // Convert WebP sticker to JPEG using Sharp
      console.log('[toPhotoHandler] Converting WebP to JPEG...');
      
      let imageBuffer: Buffer;
      
      if (isAnimated) {
        // For animated stickers, extract the first frame
        imageBuffer = await sharp(stickerBuffer)
          .jpeg({
            quality: 90,
            progressive: true
          })
          .toBuffer();
      } else {
        // For static stickers, convert directly
        imageBuffer = await sharp(stickerBuffer)
          .jpeg({
            quality: 90,
            progressive: true
          })
          .toBuffer();
      }

      console.log(`[toPhotoHandler] Image converted successfully, size: ${imageBuffer.length} bytes`);

      return {
        success: true,
        imageBuffer: imageBuffer,
        isAnimated: isAnimated,
        message: `✅ Stiker ${isAnimated ? 'animasi' : 'statis'} berhasil dikonversi menjadi gambar!`
      };

    } catch (conversionError) {
      console.error('[toPhotoHandler] Error converting sticker:', conversionError);
      return {
        success: false,
        message: `❌ Gagal mengkonversi stiker: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`
      };
    }

  } catch (error) {
    console.error('[toPhotoHandler] Error processing tophoto:', error);
    
    return {
      success: false,
      message: `❌ Terjadi kesalahan saat memproses stiker: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if message is a tophoto command
 */
export function isToPhotoCommand(messageText: string): boolean {
  const text = messageText.toLowerCase().trim();
  return text === '.tophoto' || text === '.toimg';
}

/**
 * Extract sticker info for logging
 */
export function getStickerInfo(message: WAMessage): {
  hasSticker: boolean;
  isAnimated?: boolean;
  fileSize?: number;
} {
  const stickerMsg = message.message?.stickerMessage;

  if (stickerMsg) {
    return {
      hasSticker: true,
      isAnimated: stickerMsg.isAnimated || false,
      fileSize: stickerMsg.fileLength ? Number(stickerMsg.fileLength) : undefined
    };
  }

  return { hasSticker: false };
}