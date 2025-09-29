import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export interface StickerOptions {
  isAnimated?: boolean;
  quality?: number;
  maxDuration?: number; // in seconds
}

export interface StickerResult {
  success: boolean;
  buffer?: Buffer;
  isAnimated: boolean;
  error?: string;
}

/**
 * Process image to WebP sticker format
 */
export async function processImageToSticker(
  inputBuffer: Buffer,
  options: StickerOptions = {}
): Promise<StickerResult> {
  try {
    const { quality = 80 } = options;

    console.log('[stickerProcessor] Processing image to WebP sticker');

    // Convert image to WebP format with sticker specifications
    const outputBuffer = await sharp(inputBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .webp({
        quality,
        lossless: false,
        effort: 6
      })
      .toBuffer();

    console.log(`[stickerProcessor] Image processed successfully, size: ${outputBuffer.length} bytes`);

    return {
      success: true,
      buffer: outputBuffer,
      isAnimated: false
    };

  } catch (error) {
    console.error('[stickerProcessor] Error processing image:', error);
    return {
      success: false,
      isAnimated: false,
      error: error instanceof Error ? error.message : 'Unknown error processing image'
    };
  }
}

/**
 * Process video/GIF to animated WebP sticker format
 */
export async function processVideoToSticker(
  inputBuffer: Buffer,
  options: StickerOptions = {}
): Promise<StickerResult> {
  const tempDir = tmpdir();
  const inputId = randomUUID();
  const inputPath = join(tempDir, `sticker_input_${inputId}.mp4`);
  const outputPath = join(tempDir, `sticker_output_${inputId}.webp`);

  try {
    const { quality = 80, maxDuration = 7 } = options;

    console.log('[stickerProcessor] Processing video to animated WebP sticker');

    // Write input buffer to temporary file
    await fs.writeFile(inputPath, inputBuffer);

    // Get video duration first
    const duration = await getVideoDuration(inputPath);
    console.log(`[stickerProcessor] Video duration: ${duration} seconds`);

    if (duration > maxDuration) {
      await cleanup([inputPath]);
      return {
        success: false,
        isAnimated: true,
        error: `Video terlalu panjang. Maksimal ${maxDuration} detik, video Anda ${duration.toFixed(1)} detik.`
      };
    }

    // Convert video to animated WebP with optimized settings
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          // Video filters for scaling and padding
          '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15',
          
          // WebP specific options for animation
          '-c:v', 'libwebp',
          '-lossless', '0',
          '-compression_level', '4',
          '-q:v', '75',
          '-preset', 'default',
          '-loop', '0',
          
          // Remove audio and set sync
          '-an',
          '-vsync', '0',
          
          // Force animated WebP format
          '-f', 'webp'
        ])
        .on('progress', (progress: any) => {
          console.log(`[stickerProcessor] Processing: ${Math.round(progress.percent || 0)}%`);
        })
        .on('end', () => {
          console.log('[stickerProcessor] Video processing completed');
          resolve();
        })
        .on('error', (err: any) => {
          console.error('[stickerProcessor] FFmpeg error:', err);
          reject(err);
        })
        .save(outputPath);
    });

    // Read the output file
    const outputBuffer = await fs.readFile(outputPath);
    console.log(`[stickerProcessor] Animated sticker created, size: ${outputBuffer.length} bytes`);

    // Verify if the output is actually animated
    const isActuallyAnimated = isAnimatedWebP(outputBuffer);
    console.log(`[stickerProcessor] WebP animation verification: ${isActuallyAnimated}`);

    // Cleanup temporary files
    await cleanup([inputPath, outputPath]);

    return {
      success: true,
      buffer: outputBuffer,
      isAnimated: isActuallyAnimated
    };

  } catch (error) {
    console.error('[stickerProcessor] Error processing video:', error);
    
    // Cleanup on error
    await cleanup([inputPath, outputPath]);

    return {
      success: false,
      isAnimated: true,
      error: error instanceof Error ? error.message : 'Unknown error processing video'
    };
  }
}

/**
 * Get video duration in seconds
 */
function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      if (err) {
        reject(err);
        return;
      }

      const duration = metadata.format.duration;
      if (typeof duration === 'number') {
        resolve(duration);
      } else {
        reject(new Error('Could not determine video duration'));
      }
    });
  });
}

/**
 * Clean up temporary files
 */
async function cleanup(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
      console.log(`[stickerProcessor] Cleaned up: ${filePath}`);
    } catch (error) {
      // Ignore cleanup errors
      console.warn(`[stickerProcessor] Could not cleanup ${filePath}:`, error);
    }
  }
}

/**
 * Detect media type from buffer
 */
export function detectMediaType(buffer: Buffer): 'image' | 'video' | 'unknown' {
  // Check file signatures (magic numbers)
  const header = buffer.subarray(0, 12);

  // Image formats
  if (header[0] === 0xFF && header[1] === 0xD8) return 'image'; // JPEG
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return 'image'; // PNG
  if (header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP') return 'image'; // WebP

  // Video/GIF formats
  if (header.subarray(0, 3).toString() === 'GIF') return 'video'; // GIF
  if (header.subarray(4, 8).toString() === 'ftyp') return 'video'; // MP4
  if (header[0] === 0x00 && header[1] === 0x00 && header[2] === 0x00 && header[3] === 0x18) return 'video'; // MP4 variant

  return 'unknown';
}

/**
 * Validate file size
 */
export function validateFileSize(buffer: Buffer, mediaType: 'image' | 'video'): { valid: boolean; error?: string } {
  const sizeInMB = buffer.length / (1024 * 1024);
  
  if (mediaType === 'image' && sizeInMB > 1) {
    return {
      valid: false,
      error: `Ukuran gambar terlalu besar (${sizeInMB.toFixed(1)}MB). Maksimal 1MB.`
    };
  }
  
  if (mediaType === 'video' && sizeInMB > 2) {
    return {
      valid: false,
      error: `Ukuran video terlalu besar (${sizeInMB.toFixed(1)}MB). Maksimal 2MB.`
    };
  }

  return { valid: true };
}

/**
 * Check if WebP buffer is animated
 */
export function isAnimatedWebP(buffer: Buffer): boolean {
  try {
    // Look for ANIM chunk in WebP file
    const webpSignature = buffer.subarray(0, 4).toString();
    if (webpSignature !== 'RIFF') return false;
    
    const webpFormat = buffer.subarray(8, 12).toString();
    if (webpFormat !== 'WEBP') return false;
    
    // Look for VP8X chunk which indicates extended features
    let offset = 12;
    while (offset < buffer.length - 8) {
      const chunkType = buffer.subarray(offset, offset + 4).toString();
      const chunkSize = buffer.readUInt32LE(offset + 4);
      
      if (chunkType === 'VP8X') {
        // Check animation flag in VP8X chunk
        const flags = buffer[offset + 8];
        const hasAnimation = (flags & 0x02) !== 0;
        console.log(`[stickerProcessor] WebP animation flag: ${hasAnimation}`);
        return hasAnimation;
      }
      
      if (chunkType === 'ANIM') {
        console.log('[stickerProcessor] Found ANIM chunk - WebP is animated');
        return true;
      }
      
      offset += 8 + chunkSize + (chunkSize % 2); // Align to even boundary
    }
    
    return false;
  } catch (error) {
    console.error('[stickerProcessor] Error checking WebP animation:', error);
    return false;
  }
}