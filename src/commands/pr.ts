import { supabase } from '../utils/supabaseClient';
import { getCurrentWIBTime, formatWIBDate, getTomorrowWIB, parseIndonesianDay, getDayNameForDatabase } from '../utils/time';
import { Command } from '../types';

const prCommand: Command = {
  name: 'pr',
  aliases: ['homework', 'tugas'],
  description: 'Mengelola dan menampilkan tugas/PR',
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    if (args.length === 0) {
      return await getActiveHomework();
    }

    const subCommand = args[0].toLowerCase();
    
    if (subCommand === 'add') {
      // This requires special permission check in the command handler
      return await addHomework(args.slice(1));
    }

    return '❌ Command tidak dikenali. Gunakan `.pr` atau `.pr add <mata_pelajaran> | <deskripsi> | <deadline>`.';
  }
};

// Override the command with role restrictions for 'add' subcommand
const prCommandWithRoles: Command = {
  ...prCommand,
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    if (args.length > 0 && args[0].toLowerCase() === 'add') {
      // Check permissions for add command
      const userRole = await getUserRole(senderId, isGroup);
      const allowedRoles = ['Owner', 'Sekretaris 1', 'Sekretaris 2'];
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        return 'Tidak memiliki izin.';
      }
      
      return await addHomework(args.slice(1));
    }
    
    // Check if user wants homework for specific day
    if (args.length > 0) {
      const dayArg = args[0].toLowerCase();
      if (dayArg === 'besok') {
        const tomorrow = getTomorrowWIB();
        const tomorrowStr = formatWIBDate(tomorrow);
        return await getHomeworkByDate(tomorrowStr, 'besok');
      } else {
        const parsedDay = parseIndonesianDay(dayArg);
        if (parsedDay) {
          // Calculate date for the specified day
          const targetDate = getNextDateForDay(parsedDay);
          const targetDateStr = formatWIBDate(targetDate);
          return await getHomeworkByDate(targetDateStr, dayArg);
        }
      }
    }
    
    return await getActiveHomework();
  }
};

function getNextDateForDay(dayName: string): Date {
  const today = getCurrentWIBTime();
  const targetDay = getDayNameForDatabase(today);
  
  if (targetDay === dayName) {
    return today; // If it's the same day, return today
  }
  
  // Find next occurrence of the day
  const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentDayIndex = today.getDay();
  const targetDayIndex = daysOfWeek.indexOf(dayName);
  
  let daysToAdd = targetDayIndex - currentDayIndex;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Next week
  }
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysToAdd);
  return targetDate;
}

async function getHomeworkByDate(dateStr: string, dayLabel: string): Promise<string> {
  try {
    const { data: homework, error } = await supabase
      .from('homework')
      .select('*')
      .eq('deadline', dateStr)
      .order('mapel', { ascending: true });

    if (error) {
      return 'Gagal mengambil data tugas.';
    }

    if (!homework || homework.length === 0) {
      return `Tidak ada tugas untuk ${dayLabel}.`;
    }

    const homeworkList = homework
      .map((hw, index) => `${index + 1}. ${hw.mapel} - ${hw.deskripsi}`)
      .join('\n');

    return `Tugas ${dayLabel}:\n${homeworkList}`;

  } catch (error) {
    console.error('Error fetching homework by date:', error);
    return 'Terjadi kesalahan saat mengambil data tugas.';
  }
}

async function getUserRole(senderId: string, isGroup: boolean): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('whatsapp_id', senderId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.role;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

async function getActiveHomework(): Promise<string> {
  const today = getCurrentWIBTime();
  const todayStr = formatWIBDate(today);

  try {
    const { data: homework, error } = await supabase
      .from('homework')
      .select('*')
      .gte('deadline', todayStr)
      .order('deadline', { ascending: true });

    if (error) {
      return 'Gagal mengambil data tugas.';
    }

    if (!homework || homework.length === 0) {
      return 'Tidak ada tugas aktif.';
    }

    const homeworkList = homework
      .map((hw, index) => {
        const deadline = new Date(hw.deadline);
        const deadlineStr = formatWIBDate(deadline, 'dd/MM');
        return `${index + 1}. ${hw.mapel} - ${hw.deskripsi} (${deadlineStr})`;
      })
      .join('\n');

    return `Tugas Aktif:\n${homeworkList}`;

  } catch (error) {
    console.error('Error fetching homework:', error);
    return 'Terjadi kesalahan saat mengambil data tugas.';
  }
}

async function addHomework(args: string[]): Promise<string> {
  if (args.length === 0) {
    return 'Format: .pr add <mapel> | <deskripsi> | <deadline>';
  }

  const input = args.join(' ');
  const parts = input.split('|').map(part => part.trim());

  if (parts.length !== 3) {
    return 'Format salah. Gunakan: .pr add <mapel> | <deskripsi> | <deadline>';
  }

  const [mapel, deskripsi, deadlineStr] = parts;

  // Validate deadline format
  const deadlineDate = new Date(deadlineStr);
  if (isNaN(deadlineDate.getTime())) {
    return 'Format tanggal salah. Gunakan: YYYY-MM-DD';
  }

  // Check if deadline is in the future
  const today = getCurrentWIBTime();
  if (deadlineDate < today) {
    return 'Deadline sudah lewat.';
  }

  try {
    const { error } = await supabase
      .from('homework')
      .insert({
        mapel: mapel,
        deskripsi: deskripsi,
        deadline: formatWIBDate(deadlineDate)
      });

    if (error) {
      console.error('Error adding homework:', error);
      return 'Gagal menambahkan tugas.';
    }

    const deadlineDisplay = formatWIBDate(deadlineDate, 'dd/MM/yyyy');
    return `Tugas ditambahkan: ${mapel} - ${deskripsi} (${deadlineDisplay})`;

  } catch (error) {
    console.error('Error adding homework:', error);
    return 'Terjadi kesalahan saat menambahkan tugas.';
  }
}

export default prCommandWithRoles;