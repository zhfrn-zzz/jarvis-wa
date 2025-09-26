import { Command } from '../types';
import { supabase } from '../utils/supabaseClient';
import { getCurrentWIBTime, formatWIBDate } from '../utils/time';
import { findUserById } from '../utils/userUtils';

const birthdayCommand: Command = {
  name: 'birthday',
  aliases: ['ulang', 'ultah'],
  description: 'Kelola tanggal ulang tahun',
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      if (args.length === 0) {
        return `Birthday Commands:

.birthday set DD-MM-YYYY - Set tanggal lahir Anda
.birthday list - Daftar ulang tahun bulan ini

Contoh: .birthday set 15-08-2005`;
      }

      const subCommand = args[0].toLowerCase();
      
      switch (subCommand) {
        case 'set':
          return await setBirthday(args.slice(1), senderId);
        case 'list':
          return await listBirthdays();
        default:
          return 'Sub-command tidak dikenali. Gunakan: set atau list';
      }

    } catch (error) {
      console.error('Error in birthday command:', error);
      return 'Terjadi kesalahan saat memproses birthday command.';
    }
  }
};

async function setBirthday(args: string[], senderId: string): Promise<string> {
  if (args.length === 0) {
    return 'Format: .birthday set DD-MM-YYYY\nContoh: .birthday set 15-08-2005';
  }

  const dateInput = args[0];
  
  // Validate date format DD-MM-YYYY
  const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = dateInput.match(dateRegex);
  
  if (!match) {
    return 'Format tanggal salah. Gunakan: DD-MM-YYYY\nContoh: 15-08-2005';
  }

  const [, day, month, year] = match;
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  // Validate date values
  if (dayNum < 1 || dayNum > 31) {
    return 'Hari tidak valid (1-31)';
  }
  
  if (monthNum < 1 || monthNum > 12) {
    return 'Bulan tidak valid (1-12)';
  }
  
  if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
    return 'Tahun tidak valid';
  }

  // Check if date is valid (handles leap years, etc.)
  const testDate = new Date(yearNum, monthNum - 1, dayNum);
  if (testDate.getDate() !== dayNum || testDate.getMonth() !== monthNum - 1) {
    return 'Tanggal tidak valid';
  }

  // Convert to PostgreSQL date format (YYYY-MM-DD)
  const pgDateFormat = `${year}-${month}-${day}`;

  try {
    // Find user using centralized utility
    const user = await findUserById(senderId);
    
    if (!user) {
      return 'User tidak ditemukan. Pastikan Anda terdaftar di sistem.';
    }

    // Update user's birthday
    const { data, error } = await supabase
      .from('users')
      .update({ birthday: pgDateFormat })
      .eq('id', user.id)
      .select('name, birthday')
      .single();

    if (error) {
      console.error('Error updating birthday:', error);
      return `Terjadi kesalahan saat menyimpan birthday: ${error.message}`;
    }

    if (!data) {
      return 'Terjadi kesalahan saat menyimpan birthday.';
    }

    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - yearNum;
    if (today.getMonth() < monthNum - 1 || 
        (today.getMonth() === monthNum - 1 && today.getDate() < dayNum)) {
      age--;
    }

    return `🎂 Birthday berhasil diset!

Nama: ${data.name}
Tanggal Lahir: ${dateInput}
Umur: ${age} tahun

Bot akan otomatis mengucapkan selamat ulang tahun dan memberikan bonus +100 XP!`;

  } catch (error) {
    console.error('Error setting birthday:', error);
    return 'Terjadi kesalahan saat menyimpan birthday.';
  }
}

async function listBirthdays(): Promise<string> {
  try {
    const currentDate = getCurrentWIBTime();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-based

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Get all users with birthdays and filter by month in JavaScript
    const { data: users, error } = await supabase
      .from('users')
      .select('name, birthday, whatsapp_id')
      .not('birthday', 'is', null);

    if (error) {
      return `Error: ${error.message}`;
    }

    if (!users || users.length === 0) {
      return `🎂 Tidak ada ulang tahun di bulan ${monthNames[currentMonth - 1]}.`;
    }

    // Filter users with birthdays in current month and sort by day
    const currentMonthUsers = users
      .filter(user => {
        if (!user.birthday) return false;
        const birthDate = new Date(user.birthday);
        return birthDate.getMonth() + 1 === currentMonth;
      })
      .map(user => {
        const birthDate = new Date(user.birthday);
        const day = birthDate.getDate();
        const month = birthDate.getMonth() + 1;
        return {
          ...user,
          dayNum: day,
          displayDate: `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}`
        };
      })
      .sort((a, b) => a.dayNum - b.dayNum);

    if (currentMonthUsers.length === 0) {
      return `🎂 Tidak ada ulang tahun di bulan ${monthNames[currentMonth - 1]}.`;
    }

    let birthdayList = `🎂 Ulang Tahun Bulan ${monthNames[currentMonth - 1]}:\n\n`;
    
    currentMonthUsers.forEach((user, index) => {
      const today = currentDate.getDate();
      const isToday = user.dayNum === today;
      const emoji = isToday ? '🎉' : '📅';
      const todayText = isToday ? ' (HARI INI!)' : '';
      
      birthdayList += `${emoji} ${user.displayDate} - ${user.name}${todayText}\n`;
    });

    return birthdayList;

  } catch (error) {
    console.error('Error listing birthdays:', error);
    return 'Terjadi kesalahan saat mengambil daftar birthday.';
  }
}

export default birthdayCommand;