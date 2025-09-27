import { Command } from '../types';
import { supabase } from '../utils/supabaseClient';
import { findUserById } from '../utils/userUtils';

const debugCommand: Command = {
  name: 'debug',
  aliases: ['test'],
  description: 'Debug command untuk testing',
  // allowedRoles: ['Owner'], // Temporarily removed for debugging
  
  async execute(_args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      let debugInfo = `Debug Info:\n`;
      debugInfo += `Sender ID: ${senderId}\n`;
      debugInfo += `Is Group: ${isGroup}\n\n`;

      // Use centralized findUserById function
      const foundUser = await findUserById(senderId);
      
      debugInfo += `findUserById Result:\n`;
      debugInfo += `User Found: ${foundUser ? 'Yes' : 'No'}\n`;
      
      if (foundUser) {
        debugInfo += `Found User Name: ${foundUser.name}\n`;
        debugInfo += `Found User Role: ${foundUser.role}\n`;
        debugInfo += `User ID: ${foundUser.id}\n`;
        debugInfo += `XP: ${foundUser.xp || 0}\n`;
        debugInfo += `Level: ${foundUser.level || 1}\n`;
        debugInfo += `WhatsApp ID: ${foundUser.whatsapp_id || 'Not set'}\n`;
        debugInfo += `WhatsApp LID: ${foundUser.whatsapp_lid || 'Not set'}\n`;
        debugInfo += `Birthday: ${foundUser.birthday || 'Not set'}\n`;
      } else {
        debugInfo += `User not found in database.\n`;
        
        // For debugging purposes, show manual queries
        debugInfo += `\nManual Query Results:\n`;
        
        // Check if user exists in database using whatsapp_id
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('whatsapp_id', senderId)
          .single();

        debugInfo += `whatsapp_id query: ${user ? 'Found' : 'Not found'}\n`;
        if (userError) debugInfo += `Error: ${userError.message}\n`;

        // Also check whatsapp_lid
        const { data: userLid, error: userLidError } = await supabase
          .from('users')
          .select('*')
          .eq('whatsapp_lid', senderId)
          .single();

        debugInfo += `whatsapp_lid query: ${userLid ? 'Found' : 'Not found'}\n`;
        if (userLidError) debugInfo += `Error: ${userLidError.message}\n`;
      }

      // Show sample users for reference
      const { data: sampleUsers } = await supabase
        .from('users')
        .select('whatsapp_id, whatsapp_lid, name, role')
        .limit(3);

      debugInfo += `\nSample Users in DB:\n`;
      if (sampleUsers) {
        sampleUsers.forEach((u, i) => {
          debugInfo += `${i + 1}. ${u.name} (WA ID: ${u.whatsapp_id || 'None'}, WA LID: ${u.whatsapp_lid || 'None'})\n`;
        });
      }

      return debugInfo;

    } catch (error) {
      console.error('Debug command error:', error);
      return `Debug Error: ${error}`;
    }
  }
};

export default debugCommand;