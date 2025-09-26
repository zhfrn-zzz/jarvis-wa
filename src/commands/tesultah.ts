import { Command } from '../types';
import { botManager } from '../utils/botManager';
import { BirthdayChecker } from '../schedulers/birthdayChecker';

const tesultahCommand: Command = {
  name: 'tesultah',
  aliases: ['testbirthday', 'testbd'],
  description: 'Test manual birthday scheduler (Owner only)',
  allowedRoles: ['Owner'],
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      // Check if bot socket is available
      if (!botManager.hasBotSocket()) {
        return '❌ Bot socket tidak tersedia. Bot mungkin belum terhubung sepenuhnya.';
      }

      // Get bot socket instance
      const botSocket = botManager.getBotSocket();
      
      // Create birthday checker instance
      const birthdayChecker = new BirthdayChecker(botSocket);
      
      // Manually trigger birthday wishes
      console.log('🎂 Manual birthday check triggered by Owner');
      const result = await birthdayChecker.sendBirthdayWishes();
      
      return `✅ Pemicu scheduler ulang tahun manual berhasil dijalankan.

Hasil: ${result}

Periksa grup pengumuman untuk melihat pesan ulang tahun (jika ada yang berulang tahun hari ini).`;

    } catch (error) {
      console.error('Error in tesultah command:', error);
      return `❌ Error testing birthday scheduler: ${error}`;
    }
  }
};

export default tesultahCommand;