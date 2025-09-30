import { handleToPhotoCommand, isToPhotoCommand } from '../src/handlers/tophotoHandler';

// Mock dependencies
jest.mock('../src/utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn()
  }
}));

// Mock Sharp
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('\xFF\xD8\xFF\xE0\x00\x10JFIF'))
  }));
});

jest.mock('@whiskeysockets/baileys', () => ({
  downloadMediaMessage: jest.fn(),
  WAMessage: {},
  makeWASocket: jest.fn(),
  DisconnectReason: {},
  useMultiFileAuthState: jest.fn(),
  WAMessageKey: {},
  proto: {}
}));

describe('ToPhoto Handler', () => {
  describe('isToPhotoCommand', () => {
    it('should return true for .tophoto command', () => {
      expect(isToPhotoCommand('.tophoto')).toBe(true);
      expect(isToPhotoCommand('.TOPHOTO')).toBe(true);
      expect(isToPhotoCommand('.tophoto ')).toBe(true);
    });

    it('should return true for .toimg command', () => {
      expect(isToPhotoCommand('.toimg')).toBe(true);
      expect(isToPhotoCommand('.TOIMG')).toBe(true);
      expect(isToPhotoCommand('.toimg ')).toBe(true);
    });

    it('should return false for other commands', () => {
      expect(isToPhotoCommand('.sticker')).toBe(false);
      expect(isToPhotoCommand('.help')).toBe(false);
      expect(isToPhotoCommand('.jadwal')).toBe(false);
      expect(isToPhotoCommand('tophoto')).toBe(false);
      expect(isToPhotoCommand('')).toBe(false);
    });
  });

  describe('handleToPhotoCommand', () => {
    const mockMessage = {
      key: {
        remoteJid: 'test@s.whatsapp.net',
        id: 'test-message-id'
      },
      message: {
        extendedTextMessage: {
          contextInfo: {
            quotedMessage: {
              stickerMessage: {
                isAnimated: false,
                fileLength: 1024
              }
            }
          }
        }
      }
    };

    const mockAnimatedMessage = {
      key: {
        remoteJid: 'test@s.whatsapp.net',
        id: 'test-animated-message-id'
      },
      message: {
        extendedTextMessage: {
          contextInfo: {
            quotedMessage: {
              stickerMessage: {
                isAnimated: true,
                fileLength: 2048
              }
            }
          }
        }
      }
    };

    const mockNoStickerMessage = {
      key: {
        remoteJid: 'test@s.whatsapp.net',
        id: 'test-no-sticker-id'
      },
      message: {
        extendedTextMessage: {
          contextInfo: {
            quotedMessage: {
              imageMessage: {
                fileLength: 1024
              }
            }
          }
        }
      }
    };

    const mockNoQuotedMessage = {
      key: {
        remoteJid: 'test@s.whatsapp.net',
        id: 'test-no-quoted-id'
      },
      message: {
        conversation: 'Hello world'
      }
    };

    it('should return error message when no quoted message', async () => {
      const result = await handleToPhotoCommand(mockNoQuotedMessage);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Reply sebuah stiker dengan perintah .tophoto');
    });

    it('should return error message when quoted message is not a sticker', async () => {
      const result = await handleToPhotoCommand(mockNoStickerMessage);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Reply sebuah stiker dengan perintah .tophoto');
    });

    it('should handle static sticker conversion', async () => {
      // Mock downloadMediaMessage to return a WebP buffer
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const mockWebPBuffer = Buffer.from('RIFF\x00\x00\x00\x00WEBP');
      downloadMediaMessage.mockResolvedValue(mockWebPBuffer);

      const result = await handleToPhotoCommand(mockMessage);

      expect(result.success).toBe(true);
      expect(result.imageBuffer).toEqual(Buffer.from('\xFF\xD8\xFF\xE0\x00\x10JFIF'));
      expect(result.isAnimated).toBe(false);
      expect(result.message).toContain('✅ Stiker statis berhasil dikonversi menjadi gambar!');
    });

    it('should handle animated sticker conversion', async () => {
      // Mock downloadMediaMessage to return an animated WebP buffer
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const mockAnimatedWebPBuffer = Buffer.from('RIFF\x00\x00\x00\x00WEBPANIM');
      downloadMediaMessage.mockResolvedValue(mockAnimatedWebPBuffer);

      const result = await handleToPhotoCommand(mockAnimatedMessage);

      expect(result.success).toBe(true);
      expect(result.imageBuffer).toEqual(Buffer.from('\xFF\xD8\xFF\xE0\x00\x10JFIF'));
      expect(result.isAnimated).toBe(true);
      expect(result.message).toContain('✅ Stiker animasi berhasil dikonversi menjadi gambar!');
    });

    it('should handle download errors gracefully', async () => {
      // Mock downloadMediaMessage to throw an error
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      downloadMediaMessage.mockRejectedValue(new Error('Download failed'));

      const result = await handleToPhotoCommand(mockMessage);

      expect(result.success).toBe(false);
      expect(result.message).toContain('❌ Terjadi kesalahan saat memproses stiker');
    });

    it('should handle conversion errors gracefully', async () => {
      // Mock downloadMediaMessage to return a WebP buffer
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      const mockWebPBuffer = Buffer.from('RIFF\x00\x00\x00\x00WEBP');
      downloadMediaMessage.mockResolvedValue(mockWebPBuffer);

      // Mock Sharp to throw an error
      const sharp = require('sharp');
      sharp.mockImplementation(() => ({
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error('Conversion failed'))
      }));

      const result = await handleToPhotoCommand(mockMessage);

      expect(result.success).toBe(false);
      expect(result.message).toContain('❌ Gagal mengkonversi stiker');
    });

    it('should handle empty buffer from download', async () => {
      // Mock downloadMediaMessage to return empty buffer
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');
      downloadMediaMessage.mockResolvedValue(Buffer.alloc(0));

      const result = await handleToPhotoCommand(mockMessage);

      expect(result.success).toBe(false);
      expect(result.message).toContain('❌ Gagal mengunduh stiker');
    });
  });
});