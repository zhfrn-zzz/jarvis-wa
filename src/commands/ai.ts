import { Command } from '../types';
import { getAIResponse } from '../utils/aiHandler';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const aiCommand: Command = {
  name: 'ai',
  aliases: ['ask', 'tanya'],
  description: 'Tanya AI dengan berbagai provider (Groq, Gemini, Hugging Face). Support gambar dengan Gemini.',

  async execute(args: string[], senderId: string, isGroup: boolean, message?: any): Promise<string> {
    try {
      // Get the full text after .ai as prompt
      const prompt = args.join(' ').trim();

      if (!prompt) {
        return `🤖 *AI Chat Command*

📝 *Cara Penggunaan:*
• .ai [pertanyaan Anda]
• .ask [pertanyaan Anda]
• .tanya [pertanyaan Anda]

🖼️ * dengan gambar:*
• Kirim gambar dengan caption .ai [pertanyaan]
• AI akan menganalisis gambar dan menjawab pertanyaan

📋 *Fitur:*
• Sistem failover otomatis antara provider AI
• Groq → Gemini → Hugging Face
• Support Vision/Gambar (hanya Gemini)
• Jawaban dalam bahasa Indonesia

Contoh: .ai Jelaskan tentang kecerdasan buatan
Vision: [kirim gambar] .ai Apa yang ada di gambar ini?`;
      }

      // Check for image in message (for vision)
      let imageBase64: string | undefined;
      if (message?.message?.imageMessage) {
        console.log('[AI Command] Image detected, downloading for vision...');
        try {
          const stream = await downloadMediaMessage(message, 'stream', {}) as any;
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(chunk as Buffer);
          }
          const imageBuffer = Buffer.concat(chunks);
          imageBase64 = imageBuffer.toString('base64');
          console.log('[AI Command] Image downloaded successfully for vision analysis');
        } catch (error) {
          console.error('[AI Command] Failed to download image for vision:', error);
          // Continue without image if download fails
        }
      }

      // Send thinking message
      // Note: This will be handled by the main message handler
      console.log(`[AI Command] Processing prompt: "${prompt.substring(0, 100)}..." with image: ${!!imageBase64}`);

      // Get AI response with failover
      const aiResponse = await getAIResponse(prompt, imageBase64);

      const imageText = imageBase64 ? ' (dengan gambar)' : '';
      return `🤖 *AI Response${imageText}:*\n\n${aiResponse}`;

    } catch (error) {
      console.error('Error in AI command:', error);
      return '❌ Terjadi kesalahan saat memproses permintaan AI.';
    }
  }
};

export default aiCommand;