import { Command } from '../types';
import { supabase } from '../utils/supabaseClient';

const debugCommand: Command = {
  name: 'debug',
  aliases: ['test'],
  description: 'Debug command untuk testing',
  allowedRoles: ['Owner'],
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      let debugInfo = `Debug Info:\n`;
      debugInfo += `Sender ID: ${senderId}\n`;
      debugInfo += `Is Group: ${isGroup}\n\n`;

      // Check if user exists in database
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('whatsapp_id', senderId)
        .single();

      debugInfo += `User Query Result:\n`;
      debugInfo += `Error: ${userError ? userError.message : 'None'}\n`;
      debugInfo += `User Found: ${user ? 'Yes' : 'No'}\n`;
      
      if (user) {
        debugInfo += `Name: ${user.name}\n`;
        debugInfo += `Role: ${user.role}\n`;
        debugInfo += `XP: ${user.xp}\n`;
        debugInfo += `Level: ${user.level}\n`;
      }

      // Show sample users
      const { data: sampleUsers, error: sampleError } = await supabase
        .from('users')
        .select('whatsapp_id, name, role')
        .limit(3);

      debugInfo += `\nSample Users in DB:\n`;
      if (sampleUsers) {
        sampleUsers.forEach((u, i) => {
          debugInfo += `${i + 1}. ${u.name} (${u.whatsapp_id || 'No WhatsApp ID'})\n`;
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