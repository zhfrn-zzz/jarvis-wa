import { supabase } from '../utils/supabaseClient';
import { 
  getTodayWIB, 
  getTomorrowWIB, 
  getDayNameForDatabase, 
  parseIndonesianDay,
  getIndonesianDayDisplay 
} from '../utils/time';
import { Command, JadwalKelas } from '../types';

const jadwalCommand: Command = {
  name: 'jadwal',
  aliases: ['schedule', 'kelas'],
  description: 'Menampilkan jadwal pelajaran',
  
  async execute(args: string[]): Promise<string> {
    let targetDay: string;
    
    if (args.length === 0) {
      // No argument, get today's schedule
      targetDay = getDayNameForDatabase(getTodayWIB());
    } else if (args[0].toLowerCase() === 'besok') {
      // Tomorrow's schedule
      targetDay = getDayNameForDatabase(getTomorrowWIB());
    } else {
      // Specific day
      const parsedDay = parseIndonesianDay(args[0]);
      if (!parsedDay) {
        return 'Hari tidak valid.';
      }
      targetDay = parsedDay;
    }

    try {
      const { data, error } = await supabase
        .from('jadwal_kelas')
        .select('*')
        .eq('Hari', targetDay)
        .single();

      if (error || !data) {
        return `Tidak ada jadwal untuk ${getIndonesianDayDisplay(targetDay)}.`;
      }

      const schedule: JadwalKelas = data;
      
      const dayLabel = args[0]?.toLowerCase() === 'besok' ? 'Besok' : 'Hari Ini';
      
      return `Jadwal ${dayLabel} (${getIndonesianDayDisplay(targetDay)}):
${schedule.Jam} - ${schedule['Mata Pelajaran']}
Guru: ${schedule.Guru}
Ruang: ${schedule.Ruang}`;

    } catch (error) {
      console.error('Error fetching schedule:', error);
      return 'Terjadi kesalahan saat mengambil jadwal.';
    }
  }
};

export default jadwalCommand;