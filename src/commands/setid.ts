import { Command } from '../types';
import { supabase } from '../utils/supabaseClient';
import { findUserById } from '../utils/userUtils';

const setIdCommand: Command = {
  name: 'setid',
  aliases: ['updateid'],
  description: 'Set WhatsApp ID untuk user (Owner only)',
  allowedRoles: ['Owner'],
  
  async execute(args: string[], senderId: string): Promise<string> {
    try {
      if (args.length === 0) {
        // Set sender's own ID - first verify sender is Owner
        const senderUser = await findUserById(senderId);
        if (!senderUser || senderUser.role !== 'Owner') {
          return 'Hanya Owner yang dapat menggunakan command ini.';
        }

        // Update sender's WhatsApp ID
        const { data, error } = await supabase
          .from('users')
          .update({ whatsapp_id: senderId })
          .eq('id', senderUser.id)
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
        
        // First verify sender is Owner
        const senderUser = await findUserById(senderId);
        if (!senderUser || senderUser.role !== 'Owner') {
          return 'Hanya Owner yang dapat menggunakan command ini.';
        }

        // Find target user by name
        const { data: targetUser, error: findError } = await supabase
          .from('users')
          .select('id, name')
          .ilike('name', `%${userName}%`)
          .single();

        if (findError || !targetUser) {
          return `User dengan nama "${userName}" tidak ditemukan.`;
        }

        // Update target user's WhatsApp ID
        const { data, error } = await supabase
          .from('users')
          .update({ whatsapp_id: senderId })
          .eq('id', targetUser.id)
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