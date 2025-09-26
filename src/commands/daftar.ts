import { Command } from '../types';
import { supabase } from '../utils/supabaseClient';
import { getCurrentWIBTime } from '../utils/time';
import { findUserById } from '../utils/userUtils';

const daftarCommand: Command = {
  name: 'daftar',
  aliases: ['register', 'signup'],
  description: 'Daftar akun menggunakan kode unik',
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      if (args.length === 0) {
        return `Format pendaftaran:
.daftar [KODE UNIK] | [Tanggal Lahir DD-MM-YYYY]

Contoh: .daftar ABC950 | 15-08-2005

Hubungi admin untuk mendapatkan kode pendaftaran Anda.`;
      }

      // Join all arguments and split by |
      const input = args.join(' ');
      const parts = input.split('|').map(part => part.trim());

      if (parts.length !== 2) {
        return `❌ Format salah. Gunakan:
.daftar [KODE UNIK] | [Tanggal Lahir DD-MM-YYYY]

Contoh: .daftar ABC950 | 15-08-2005`;
      }

      const [registrationCode, birthdayInput] = parts;

      // Validate registration code format (not empty)
      if (!registrationCode || registrationCode.length === 0) {
        return '❌ Kode pendaftaran tidak boleh kosong.';
      }

      // Validate birthday format
      const birthdayValidation = validateBirthday(birthdayInput);
      if (!birthdayValidation.valid) {
        return birthdayValidation.error || '❌ Format tanggal lahir tidak valid.';
      }

      // Check if registration code exists and is not used
      const { data: codeData, error: codeError } = await supabase
        .from('registration_codes')
        .select('*')
        .eq('code', registrationCode)
        .single();

      if (codeError || !codeData) {
        return '❌ Kode pendaftaran tidak valid atau sudah digunakan.';
      }

      if (codeData.is_used) {
        return '❌ Kode pendaftaran tidak valid atau sudah digunakan.';
      }

      // Check if user is already registered using centralized user lookup
      const existingUser = await findUserById(senderId);

      if (existingUser) {
        return `❌ WhatsApp Anda sudah terdaftar di sistem dengan nama: ${existingUser.name}`;
      }

      // Update user with WhatsApp ID and birthday
      const updateData = {
        ...(isGroup ? { whatsapp_lid: senderId } : { whatsapp_id: senderId }),
        birthday: birthdayValidation.pgDate
      };

      const { data: userData, error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('name', codeData.student_name)
        .select('name, role')
        .single();

      if (userError || !userData) {
        console.error('Error updating user:', userError);
        return '❌ Gagal memperbarui data pengguna. Silakan hubungi admin.';
      }

      // Mark registration code as used
      const { error: codeUpdateError } = await supabase
        .from('registration_codes')
        .update({
          is_used: true,
          used_at: getCurrentWIBTime().toISOString()
        })
        .eq('code', registrationCode);

      if (codeUpdateError) {
        console.error('Error updating registration code:', codeUpdateError);
        // Don't return error here as user is already registered
      }

      return `✅ Pendaftaran berhasil! Selamat datang, ${userData.name}! 

🎉 Akun Anda sudah sepenuhnya terhubung.
👤 Role: ${userData.role}
🎂 Birthday: ${birthdayInput}

Sekarang Anda bisa menggunakan semua fitur bot:
• .profile - Lihat profil Anda
• .help - Lihat semua command
• .birthday list - Lihat daftar ulang tahun

Selamat bergabung di X TKJ C! 🚀`;

    } catch (error) {
      console.error('Error in daftar command:', error);
      return '❌ Terjadi kesalahan saat memproses pendaftaran. Silakan coba lagi.';
    }
  }
};

interface BirthdayValidation {
  valid: boolean;
  error?: string;
  pgDate?: string;
}

function validateBirthday(birthdayInput: string): BirthdayValidation {
  // Validate date format DD-MM-YYYY
  const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = birthdayInput.match(dateRegex);
  
  if (!match) {
    return {
      valid: false,
      error: '❌ Format tanggal lahir salah. Gunakan: DD-MM-YYYY\nContoh: 15-08-2005'
    };
  }

  const [, day, month, year] = match;
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  // Validate date values
  if (dayNum < 1 || dayNum > 31) {
    return {
      valid: false,
      error: '❌ Hari tidak valid (1-31)'
    };
  }
  
  if (monthNum < 1 || monthNum > 12) {
    return {
      valid: false,
      error: '❌ Bulan tidak valid (1-12)'
    };
  }
  
  if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
    return {
      valid: false,
      error: '❌ Tahun tidak valid'
    };
  }

  // Check if date is valid (handles leap years, etc.)
  const testDate = new Date(yearNum, monthNum - 1, dayNum);
  if (testDate.getDate() !== dayNum || testDate.getMonth() !== monthNum - 1) {
    return {
      valid: false,
      error: '❌ Tanggal tidak valid'
    };
  }

  // Check if birthday is not in the future
  const today = new Date();
  if (testDate > today) {
    return {
      valid: false,
      error: '❌ Tanggal lahir tidak boleh di masa depan'
    };
  }

  // Convert to PostgreSQL date format (YYYY-MM-DD)
  const pgDate = `${year}-${month}-${day}`;

  return {
    valid: true,
    pgDate: pgDate
  };
}

export default daftarCommand;