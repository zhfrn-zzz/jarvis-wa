import { Command } from '../types';
import { supabase } from '../utils/supabaseClient';

const setNameCommand: Command = {
  name: 'setname',
  aliases: ['updatename'],
  description: 'Set nama lengkap untuk profil Anda',
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      if (args.length === 0) {
        return 'Format: .setname <nama lengkap>\nContoh: .setname Zhafran Arifindhito';
      }

      const fullName = args.join(' ');
      
      const { data, error } = await supabase
        .from('users')
        .update({ nama: fullName })
        .eq('whatsapp_id', senderId)
        .select('nama, role')
        .single();

      if (error) {
        return `Error: ${error.message}`;
      }

      if (!data) {
        return 'User tidak ditemukan. Pastikan Anda terdaftar di sistem.';
      }

      return `✅ Nama berhasil diupdate!
Nama: ${data.nama}
Role: ${data.role}

Sekarang coba .profile untuk melihat profil Anda!`;

    } catch (error) {
      console.error('SetName command error:', error);
      return `Error: ${error}`;
    }
  }
};

export default setNameCommand;