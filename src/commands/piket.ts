import { supabase } from '../utils/supabaseClient';
import { 
  getTodayWIB, 
  getTomorrowWIB, 
  getDayNameForDatabase, 
  parseIndonesianDay,
  getIndonesianDayDisplay 
} from '../utils/time';
import { Command, Piket } from '../types';

const piketCommand: Command = {
  name: 'piket',
  aliases: ['cleaningduty'],
  description: 'Menampilkan jadwal piket',
  
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
        .from('piket')
        .select('*')
        .eq('hari', targetDay.toUpperCase())
        .single();

      if (error || !data) {
        return `Tidak ada piket untuk ${getIndonesianDayDisplay(targetDay)}.`;
      }

      const piket: Piket = data;
      
      if (!piket.nama_siswa || piket.nama_siswa.length === 0) {
        return `Tidak ada yang piket ${getIndonesianDayDisplay(targetDay)}.`;
      }

      const studentList = piket.nama_siswa
        .map((name, index) => `${index + 1}. ${name}`)
        .join('\n');

      const dayLabel = args[0]?.toLowerCase() === 'besok' ? 'Besok' : 'Hari Ini';
      
      return `Piket ${dayLabel} (${getIndonesianDayDisplay(targetDay)}):\n${studentList}`;

    } catch (error) {
      console.error('Error fetching piket schedule:', error);
      return 'Terjadi kesalahan saat mengambil jadwal piket.';
    }
  }
};

export default piketCommand;