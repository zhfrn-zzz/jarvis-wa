import axios from 'axios';
import { Command } from '../types';

const downloadCommand: Command = {
  name: 'download',
  aliases: ['dl'],
  description: 'Download video/audio dari YouTube, TikTok, dan Instagram',

  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      // Parse arguments: [format] [URL]
      let format = 'mp4'; // default format
      let url = '';

      if (args.length === 0) {
        return `❌ Format: .dl [format] [URL]

📝 *Cara Penggunaan:*
• .dl [URL] - Download video (format MP4)
• .dl mp3 [URL] - Download audio (format MP3)
• .dl mp4 [URL] - Download video (format MP4)

📋 *Platform yang didukung:*
• YouTube
• TikTok
• Instagram

Contoh: .dl https://www.youtube.com/watch?v=xxxxx`;
      }

      if (args.length === 1) {
        // Only URL provided, use default format (mp4)
        url = args[0];
      } else if (args.length >= 2) {
        // Format and URL provided
        const firstArg = args[0].toLowerCase();
        if (firstArg === 'mp3' || firstArg === 'mp4') {
          format = firstArg;
          url = args.slice(1).join(' ');
        } else {
          // First arg is not a format, treat as URL with default format
          url = args.join(' ');
        }
      }

      // Validate URL
      if (!url || !url.startsWith('http')) {
        return '❌ URL tidak valid. Pastikan URL dimulai dengan http:// atau https://';
      }

      // Validate format
      if (format !== 'mp3' && format !== 'mp4') {
        return '❌ Format tidak valid. Gunakan mp3 atau mp4.';
      }

      // Check environment variables
      const rapidApiKey = process.env.RAPIDAPI_KEY;
      const rapidApiHost = process.env.RAPIDAPI_HOST || 'social-download-all-in-one.p.rapidapi.com';

      if (!rapidApiKey) {
        return '❌ Konfigurasi API tidak lengkap. Hubungi admin untuk mengatur RAPIDAPI_KEY.';
      }

      // Send processing message
      console.log(`[download] Processing ${format} download for URL: ${url}`);

      // This will trigger special handling in index.ts
      // Return a special marker that index.ts will recognize
      return `__DOWNLOAD_REQUEST__${format}__${url}__${senderId}`;

    } catch (error) {
      console.error('Error in download command:', error);
      return '❌ Terjadi kesalahan saat memproses perintah download.';
    }
  }
};

export default downloadCommand;