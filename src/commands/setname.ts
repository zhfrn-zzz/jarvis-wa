import { Command } from '../types';
import { supabase } from '../utils/supabaseClient';
import { findUserById } from '../utils/userUtils';

const setNameCommand: Command = {
  name: 'setname',
  aliases: ['updatename'],
  description: 'Set nama lengkap untuk profil Anda',
  
  async execute(args: string[], senderId: string): Promise<string> {
    try {
      if (args.length === 0) {
        return 'Format: .setname <nama lengkap>\nContoh: .setname Zhafran Arifindhito';
      }

      const fullName = args.join(' ');
      
      // First check if user exists using centralized function
      const user = await findUserById(senderId);
      if (!user) {
        return 'User tidak ditemukan. Pastikan Anda terdaftar di sistem.';
      }

      // Update the user's name using their database ID
      const { data, error } = await supabase
        .from('users')
        .update({ name: fullName })
        .eq('id', user.id)
        .select('name, role')
        .single();

      if (error) {
        return `Error: ${error.message}`;
      }

      if (!data) {
        return 'Gagal mengupdate nama. Silakan coba lagi.';
      }

      return `✅ Nama berhasil diupdate!
Nama: ${data.name}
Role: ${data.role}

Sekarang coba .profile untuk melihat profil Anda!`;

    } catch (error) {
      console.error('SetName command error:', error);
      return `Error: ${error}`;
    }
  }
};

export default setNameCommand;