import { Command } from '../types';
import { supabase } from '../utils/supabaseClient';

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

Hubungi admin untuk mendapatkan kode pendaftaran Anda.
Anda dapat menggunakan kode yang sama untuk mendaftar di chat pribadi dan grup.`;
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

      // Step 2: Check if registration code exists (no longer check is_used)
      const { data: codeData, error: codeError } = await supabase
        .from('registration_codes')
        .select('student_name')
        .eq('code', registrationCode)
        .single();

      if (codeError || !codeData) {
        return '❌ Kode pendaftaran tidak valid.';
      }

      // Step 4: Get student data from users table based on student_name
      const { data: studentData, error: studentError } = await supabase
        .from('users')
        .select('id, name, role, whatsapp_id, whatsapp_lid')
        .eq('name', codeData.student_name)
        .single();

      if (studentError || !studentData) {
        console.error('Error finding student:', studentError);
        return '❌ Data siswa tidak ditemukan. Silakan hubungi admin.';
      }

      // Step 5: Check sender ID type and handle registration accordingly
      const isPrivateMessage = senderId.endsWith('@s.whatsapp.net');
      const isGroupMessage = senderId.endsWith('@lid');

      if (isPrivateMessage) {
        // Handle Private ID (JID) registration
        if (studentData.whatsapp_id) {
          return `❌ ID Pribadi Anda sudah terdaftar.
Nama: ${studentData.name}
Role: ${studentData.role}

Jika Anda belum mendaftar dari grup, silakan kirim perintah yang sama di dalam grup.`;
        }

        // Update whatsapp_id and birthday
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            whatsapp_id: senderId,
            birthday: birthdayValidation.pgDate
          })
          .eq('id', studentData.id)
          .select('name, role')
          .single();

        if (updateError || !updatedUser) {
          console.error('Error updating private ID:', updateError);
          return '❌ Gagal memperbarui ID Pribadi. Silakan hubungi admin.';
        }

        return `✅ ID Pribadi berhasil ditautkan!

👤 Nama: ${updatedUser.name}
🏷️ Role: ${updatedUser.role}
🎂 Birthday: ${birthdayInput}
📱 ID Pribadi: Terdaftar

Jika Anda belum mendaftar dari grup, silakan kirim perintah yang sama di dalam grup.

Sekarang Anda bisa menggunakan fitur bot:
• .profile - Lihat profil Anda
• .help - Lihat semua command`;

      } else if (isGroupMessage) {
        // Handle Group ID (LID) registration
        if (studentData.whatsapp_lid) {
          return `❌ ID Grup Anda sudah terdaftar.
Nama: ${studentData.name}
Role: ${studentData.role}

Jika Anda belum mendaftar dari DM, silakan kirim perintah yang sama di chat pribadi.`;
        }

        // Update whatsapp_lid and birthday
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            whatsapp_lid: senderId,
            birthday: birthdayValidation.pgDate
          })
          .eq('id', studentData.id)
          .select('name, role')
          .single();

        if (updateError || !updatedUser) {
          console.error('Error updating group ID:', updateError);
          return '❌ Gagal memperbarui ID Grup. Silakan hubungi admin.';
        }

        return `✅ ID Grup berhasil ditautkan!

👤 Nama: ${updatedUser.name}
🏷️ Role: ${updatedUser.role}
🎂 Birthday: ${birthdayInput}
👥 ID Grup: Terdaftar

Jika Anda belum mendaftar dari DM, silakan kirim perintah yang sama di chat pribadi.

Sekarang Anda bisa menggunakan fitur bot:
• .profile - Lihat profil Anda
• .help - Lihat semua command`;

      } else {
        // Unknown ID format
        return `❌ Format ID tidak dikenali.
ID Anda: ${senderId}

Pastikan Anda mengirim perintah ini dari:
• Chat pribadi (ID berakhiran @s.whatsapp.net)
• Grup WhatsApp (ID berakhiran @lid)`;
      }

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