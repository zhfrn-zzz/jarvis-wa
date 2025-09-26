import { Command } from '../types';
import { supabase } from '../utils/supabaseClient';

const setIdCommand: Command = {
  name: 'setid',
  aliases: ['updateid'],
  description: 'Set WhatsApp ID untuk user (Owner only)',
  allowedRoles: ['Owner'],
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      if (args.length === 0) {
        // Set sender's own ID
        const { data, error } = await supabase
          .from('users')
          .update({ whatsapp_id: senderId })
          .eq('role', 'Owner')
          .select('name')
          .single();

        if (error) {
          return `Error: ${error.message}`;
        }

        return `WhatsApp ID berhasil diset untuk ${data?.name}
ID: ${senderId}`;
      } else {
        // Set ID for specific user by name
        const userName = args.join(' ');
        
        const { data, error } = await supabase
          .from('users')
          .update({ whatsapp_id: senderId })
          .ilike('name', `%${userName}%`)
          .select('name')
          .single();

        if (error) {
          return `Error: ${error.message}`;
        }

        return `WhatsApp ID berhasil diset untuk ${data?.name}
ID: ${senderId}`;
      }

    } catch (error) {
      console.error('SetID command error:', error);
      return `Error: ${error}`;
    }
  }
};

export default setIdCommand;