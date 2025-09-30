import { Command } from '../types';

const tophotoCommand: Command = {
  name: 'tophoto',
  aliases: ['toimg'],
  description: 'Konversi stiker WhatsApp menjadi gambar biasa',
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      // Note: This command requires special handling in the message handler
      // because it needs access to the actual WhatsApp message object to process quoted stickers
      
      return `🖼️ *Sticker to Photo Converter*

📝 *Cara Penggunaan:*
1. Reply sebuah stiker dengan perintah \`.tophoto\`
2. Bot akan mengunduh dan mengkonversi stiker menjadi gambar
3. Gambar akan dikirim kembali sebagai foto biasa

📋 *Format Output:*
• Format: JPG (kualitas tinggi)
• Stiker animasi akan dikonversi menjadi frame pertama

⚠️ *Catatan:* Command ini hanya bekerja dengan membalas stiker.`;

    } catch (error) {
      console.error('Error in tophoto command:', error);
      return '❌ Terjadi kesalahan saat memproses perintah tophoto.';
    }
  }
};

export default tophotoCommand;