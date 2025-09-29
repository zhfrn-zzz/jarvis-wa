// Simple sticker handler that doesn't require WAMessage types

export interface SimpleStickerResult {
  success: boolean;
  message: string;
  mediaDetected?: {
    type: 'image' | 'video';
    size?: number;
    source: 'direct' | 'reply';
  };
}

/**
 * Simple sticker handler that detects media but doesn't process it
 * This is used when full dependencies (sharp, ffmpeg) are not installed
 */
export async function handleSimpleStickerCommand(
  message: any,
  quotedMessage?: any
): Promise<SimpleStickerResult> {
  try {
    console.log('[simpleStickerHandler] Processing sticker command (detection only)');

    // Determine which message contains the media
    const mediaMessage = quotedMessage || message;
    const source = quotedMessage ? 'reply' : 'direct';
    
    // Check if message has media
    const hasImage = mediaMessage.message?.imageMessage;
    const hasVideo = mediaMessage.message?.videoMessage;

    if (!hasImage && !hasVideo) {
      return {
        success: false,
        message: `❌ *Tidak ada media yang ditemukan!*

📝 *Cara Penggunaan:*
1. Kirim gambar dengan caption \`.sticker\`
2. Kirim video/GIF dengan caption \`.sticker\`
3. Reply gambar/video dengan \`.sticker\`

📋 *Format yang didukung:*
• Gambar: JPG, PNG, WEBP (maks 1MB)
• Video: MP4, GIF (maks 2MB, 7 detik)`
      };
    }

    const mediaType = hasImage ? 'image' : 'video';
    const fileSize = hasImage 
      ? (hasImage.fileLength ? Number(hasImage.fileLength) : undefined)
      : (hasVideo?.fileLength ? Number(hasVideo.fileLength) : undefined);

    console.log(`[simpleStickerHandler] Detected ${mediaType} media from ${source} message`);

    // Check file size limits
    if (fileSize) {
      const sizeInMB = fileSize / (1024 * 1024);
      const maxSize = mediaType === 'image' ? 1 : 2;
      
      if (sizeInMB > maxSize) {
        return {
          success: false,
          message: `❌ Ukuran ${mediaType === 'image' ? 'gambar' : 'video'} terlalu besar (${sizeInMB.toFixed(1)}MB). Maksimal ${maxSize}MB.`,
          mediaDetected: { type: mediaType, size: fileSize, source }
        };
      }
    }

    // Check video duration if available
    if (hasVideo?.seconds && hasVideo.seconds > 7) {
      return {
        success: false,
        message: `❌ Video terlalu panjang (${hasVideo.seconds} detik). Maksimal 7 detik.`,
        mediaDetected: { type: mediaType, size: fileSize, source }
      };
    }

    return {
      success: false, // Not actually processing, just detecting
      message: `🎨 *Media Terdeteksi untuk Sticker!*

✅ *Informasi Media:*
• Type: ${mediaType === 'image' ? 'Gambar' : 'Video'}
• Source: ${source === 'reply' ? 'Reply message' : 'Direct message'}
• Size: ${fileSize ? `${(fileSize / 1024 / 1024).toFixed(1)}MB` : 'Unknown'}
${hasVideo?.seconds ? `• Duration: ${hasVideo.seconds} detik` : ''}

⚠️ *Status:* Fitur sticker memerlukan dependencies tambahan:
\`\`\`
npm install sharp fluent-ffmpeg
\`\`\`

🔧 *Setelah install dependencies:*
1. Restart bot
2. Kirim ulang perintah sticker
3. Sticker akan otomatis diproses dan dikirim

📝 *Media ini sudah memenuhi syarat untuk dijadikan sticker!*`,
      mediaDetected: { type: mediaType, size: fileSize, source }
    };

  } catch (error) {
    console.error('[simpleStickerHandler] Error:', error);
    
    return {
      success: false,
      message: `❌ Terjadi kesalahan saat memproses sticker: ${error instanceof Error ? error.message : 'Unknown error'}`
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