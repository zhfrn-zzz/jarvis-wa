/**
 * Example integration of sticker handler with main WhatsApp message handler
 * This shows how to integrate the sticker functionality into your existing bot
 */

import { WAMessage, WASocket } from '@whiskeysockets/baileys';
import { handleStickerCommand, isStickerCommand, getMediaInfo } from '../handlers/stickerHandler';
import { commandHandler } from '../handlers/commandHandler';

/**
 * Enhanced message handler that supports sticker conversion
 */
export async function handleMessage(
  sock: WASocket,
  message: WAMessage
): Promise<void> {
  try {
    const messageText = message.message?.conversation || 
                       message.message?.extendedTextMessage?.text || '';
    
    const senderId = message.key.remoteJid || '';
    const isGroup = senderId.endsWith('@g.us');
    
    // Check if this is a sticker command
    if (isStickerCommand(messageText)) {
      console.log('[messageHandler] Sticker command detected');
      
      // Get quoted message if this is a reply
      const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage 
        ? {
            key: message.message.extendedTextMessage.contextInfo.stanzaId 
              ? { id: message.message.extendedTextMessage.contextInfo.stanzaId }
              : {},
            message: message.message.extendedTextMessage.contextInfo.quotedMessage
          } as WAMessage
        : undefined;
      
      // Log media info for debugging
      const mediaInfo = getMediaInfo(quotedMessage || message);
      console.log('[messageHandler] Media info:', mediaInfo);
      
      // Process sticker
      const stickerResult = await handleStickerCommand(message, quotedMessage);
      
      if (stickerResult.success && stickerResult.stickerBuffer) {
        // Send sticker
        await sock.sendMessage(senderId, {
          sticker: stickerResult.stickerBuffer,
          mimetype: 'image/webp'
        });
        
        console.log(`[messageHandler] Sticker sent successfully (animated: ${stickerResult.isAnimated})`);
      } else {
        // Send error message
        await sock.sendMessage(senderId, {
          text: stickerResult.message
        });
      }
      
      return; // Don't process as regular command
    }
    
    // Handle regular commands
    if (messageText.startsWith('.')) {
      const response = await commandHandler.handleMessage(messageText, senderId, isGroup);
      
      if (response) {
        await sock.sendMessage(senderId, { text: response });
      }
    }
    
  } catch (error) {
    console.error('[messageHandler] Error handling message:', error);
    
    // Send generic error message
    const senderId = message.key.remoteJid || '';
    await sock.sendMessage(senderId, {
      text: '❌ Terjadi kesalahan saat memproses pesan. Silakan coba lagi.'
    });
  }
}

/**
 * Alternative integration for existing command structure
 * This modifies the existing command handler to support media commands
 */
export class EnhancedCommandHandler {
  private sock: WASocket | null = null;
  
  setBotSocket(sock: WASocket): void {
    this.sock = sock;
  }
  
  async handleMessage(
    messageText: string, 
    senderId: string, 
    isGroup: boolean,
    originalMessage?: WAMessage
  ): Promise<string | null> {
    
    // Check for sticker command with media context
    if (isStickerCommand(messageText) && originalMessage && this.sock) {
      try {
        const stickerResult = await handleStickerCommand(originalMessage);
        
        if (stickerResult.success && stickerResult.stickerBuffer) {
          // Send sticker directly
          await this.sock.sendMessage(senderId, {
            sticker: stickerResult.stickerBuffer,
            mimetype: 'image/webp'
          });
          
          return null; // Don't return text response
        } else {
          return stickerResult.message;
        }
      } catch (error) {
        console.error('[EnhancedCommandHandler] Sticker error:', error);
        return '❌ Terjadi kesalahan saat memproses stiker.';
      }
    }
    
    // Fallback to regular command handling
    return await commandHandler.handleMessage(messageText, senderId, isGroup);
  }
}

/**
 * Usage example in main bot file
 */
export function exampleUsage() {
  /*
  // In your main bot file (src/index.ts), replace the message handler:
  
  sock.ev.on('messages.upsert', async (m) => {
    const message = m.messages[0];
    if (!message.key.fromMe && message.message) {
      await handleMessage(sock, message);
    }
  });
  
  // Or if using the enhanced command handler:
  
  const enhancedHandler = new EnhancedCommandHandler();
  enhancedHandler.setBotSocket(sock);
  
  sock.ev.on('messages.upsert', async (m) => {
    const message = m.messages[0];
    if (!message.key.fromMe && message.message) {
      const messageText = message.message?.conversation || 
                         message.message?.extendedTextMessage?.text || '';
      const senderId = message.key.remoteJid || '';
      const isGroup = senderId.endsWith('@g.us');
      
      const response = await enhancedHandler.handleMessage(
        messageText, 
        senderId, 
        isGroup, 
        message
      );
      
      if (response) {
        await sock.sendMessage(senderId, { text: response });
      }
    }
  });
  */
}