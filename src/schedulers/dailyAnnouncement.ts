import * as cron from 'node-cron';
import { supabase } from '../utils/supabaseClient';
import { 
  getTomorrowWIB, 
  getDayNameForDatabase, 
  getIndonesianDayDisplay,
  formatWIBDate,
  getCurrentWeekRange,
  calculatePayableWeeks,
  getCurrentWIBTime,
  getKasPeriodStart
} from '../utils/time';

export class DailyAnnouncementScheduler {
  private sock: any;

  constructor(sock: any) {
    this.sock = sock;
  }

  start(): void {
    // Schedule for 18:00 WIB (11:00 UTC)
    cron.schedule('0 18 * * *', async () => {
      await this.sendDailyAnnouncement();
    }, {
      timezone: 'Asia/Jakarta'
    });

    console.log('📅 Daily announcement scheduler started (18:00 WIB)');
  }

  private async sendDailyAnnouncement(): Promise<void> {
    try {
      // Get announcement group ID from settings
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'announcementGroupId')
        .single();

      if (settingsError || !settings) {
        console.error('❌ Announcement group ID not found in settings');
        return;
      }

      const groupId = settings.value;
      const tomorrow = getTomorrowWIB();
      const tomorrowDay = getDayNameForDatabase(tomorrow);
      const tomorrowDisplay = getIndonesianDayDisplay(tomorrowDay);
      const tomorrowDate = formatWIBDate(tomorrow, 'dd/MM/yyyy');

      // Fetch tomorrow's data
      const [schedule, piket, kasArrears, homework] = await Promise.all([
        this.getTomorrowSchedule(tomorrowDay),
        this.getTomorrowPiket(tomorrowDay),
        this.getWeeklyKasArrears(),
        this.getTomorrowHomework(tomorrow)
      ]);

      // Build announcement message
      const message = this.buildAnnouncementMessage(
        tomorrowDisplay,
        tomorrowDate,
        schedule,
        piket,
        kasArrears,
        homework
      );

      // Send message
      await this.sock.sendMessage(groupId, { text: message });
      console.log(`✅ Daily announcement sent for ${tomorrowDisplay}`);

    } catch (error) {
      console.error('❌ Error sending daily announcement:', error);
    }
  }

  private async getTomorrowSchedule(day: string): Promise<any> {
    const { data, error } = await supabase
      .from('jadwal_kelas')
      .select('*')
      .eq('Hari', day)
      .single();

    return error ? null : data;
  }

  private async getTomorrowPiket(day: string): Promise<any> {
    const { data, error } = await supabase
      .from('piket')
      .select('*')
      .eq('hari', day.toUpperCase())
      .single();

    return error ? null : data;
  }

  private async getWeeklyKasArrears(): Promise<Array<{nama: string, tunggakan: string}>> {
    // Get students who haven't paid (status is not 'Lunas')
    const { data: unpaidStudents, error } = await supabase
      .from('kas_siswa')
      .select('nama_siswa, sudah_bayar')
      .neq('status', 'Lunas');

    if (error || !unpaidStudents) {
      return [];
    }

    // Calculate dynamic total_wajib_bayar
    const today = getCurrentWIBTime();
    const totalPayableWeeks = calculatePayableWeeks(getKasPeriodStart(), today);
    const dynamicTotalWajibBayar = totalPayableWeeks * 5000;

    return unpaidStudents.map(student => {
      const tunggakan = dynamicTotalWajibBayar - student.sudah_bayar;
      const mingguTunggakan = Math.floor(tunggakan / 5000);
      const tunggakanText = mingguTunggakan > 0 ? ` (Nunggak ${mingguTunggakan} minggu)` : '';
      
      return {
        nama: student.nama_siswa,
        tunggakan: tunggakanText
      };
    });
  }

  private async getTomorrowHomework(tomorrow: Date): Promise<any[]> {
    const tomorrowStr = formatWIBDate(tomorrow);

    const { data, error } = await supabase
      .from('homework')
      .select('*')
      .eq('deadline', tomorrowStr);

    return error ? [] : (data || []);
  }

  private buildAnnouncementMessage(
    day: string,
    date: string,
    schedule: any,
    piket: any,
    kasArrears: Array<{nama: string, tunggakan: string}>,
    homework: any[]
  ): string {
    let message = `🔔 *PENGUMUMAN HARIAN*\n📅 ${day}, ${date}\n\n`;

    // Schedule section
    if (schedule) {
      message += `📚 *JADWAL PELAJARAN:*\n`;
      message += `⏰ Waktu: ${schedule.Jam}\n`;
      message += `📖 Mata Pelajaran: ${schedule['Mata Pelajaran']}\n`;
      message += `👨‍🏫 Guru: ${schedule.Guru}\n`;
      message += `🚪 Ruang: ${schedule.Ruang}\n\n`;
    } else {
      message += `📚 *JADWAL PELAJARAN:*\nTidak ada jadwal pelajaran.\n\n`;
    }

    // Piket section
    if (piket && piket.nama_siswa && piket.nama_siswa.length > 0) {
      message += `🧹 *JADWAL PIKET:*\n`;
      piket.nama_siswa.forEach((name: string, index: number) => {
        message += `${index + 1}. ${name}\n`;
      });
      message += `\n`;
    } else {
      message += `🧹 *JADWAL PIKET:*\nTidak ada jadwal piket.\n\n`;
    }

    // Kas arrears section
    if (kasArrears.length > 0) {
      message += `💰 *KAS BELUM BAYAR MINGGU INI:*\n`;
      kasArrears.slice(0, 10).forEach((student, index) => {
        message += `- ${student.nama}${student.tunggakan}\n`;
      });
      if (kasArrears.length > 10) {
        message += `... dan ${kasArrears.length - 10} siswa lainnya\n`;
      }
      message += `\n`;
    } else {
      message += `💰 *KAS KELAS:*\n✅ Semua siswa sudah membayar minggu ini!\n\n`;
    }

    // Homework section
    if (homework.length > 0) {
      message += `📝 *TUGAS DEADLINE BESOK:*\n`;
      homework.forEach((hw, index) => {
        message += `${index + 1}. ${hw.mapel}: ${hw.deskripsi}\n`;
      });
      message += `\n`;
    }

    message += `_Pesan otomatis dari Jarvis Bot_ 🤖`;

    return message;
  }
}