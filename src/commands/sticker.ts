import { Command } from '../types';

const stickerCommand: Command = {
  name: 'sticker',
  aliases: ['s', 'stiker'],
  description: 'Konversi gambar atau video menjadi stiker WhatsApp',
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      // Note: This command requires special handling in the message handler
      // because it needs access to the actual WhatsApp message object to process media
      
      return `🎨 *Sticker Converter*

📝 *Cara Penggunaan:*
1. Kirim gambar dengan caption \`.sticker\`
2. Kirim video/GIF dengan caption \`.sticker\`
3. Reply gambar/video dengan \`.sticker\`

📋 *Ketentuan:*
• Format gambar: JPG, PNG, WEBP
• Format video: MP4, GIF (maks 7 detik)
• Ukuran file maksimal: 1MB untuk gambar, 2MB untuk video

⚠️ *Catatan:* Command ini memerlukan media (gambar/video) untuk diproses.`;

    } catch (error) {
      console.error('Error in sticker command:', error);
      return '❌ Terjadi kesalahan saat memproses perintah sticker.';
    }
  }
};

export default stickerCommand;