import { supabase } from '../utils/supabaseClient';
import { getCurrentWeekRange, isDateInCurrentWeek, calculatePayableWeeks, getCurrentWIBTime, getKasPeriodStart } from '../utils/time';
import { Command, KasSiswa, KasHistory } from '../types';

const kasCommand: Command = {
  name: 'kas',
  aliases: ['keuangan'],
  description: 'Menampilkan informasi kas kelas',
  
  async execute(args: string[]): Promise<string> {
    try {
      if (args.length === 0) {
        return await getWeeklySummary();
      }

      const subCommand = args[0].toLowerCase();
      
      switch (subCommand) {
        case 'lunas':
          return await getPaidStudents();
        case 'belum':
        case 'nunggak':
          return await getUnpaidStudents();
        default:
          // Assume it's a student name
          const studentName = args.join(' ');
          return await getStudentStatus(studentName);
      }
    } catch (error) {
      console.error('Error in kas command:', error);
      return 'Terjadi kesalahan saat mengambil data kas.';
    }
  }
};

async function getWeeklySummary(): Promise<string> {
  // Get all students
  const { data: allStudents, error: studentsError } = await supabase
    .from('kas_siswa')
    .select('*');

  if (studentsError || !allStudents) {
    return 'Gagal mengambil data siswa.';
  }

  // Count students by status
  const paidCount = allStudents.filter(student => student.status === 'Lunas').length;
  const unpaidCount = allStudents.filter(student => student.status === 'Belum Bayar').length;
  const kurangCount = allStudents.filter(student => student.status === 'Kurang').length;
  
  // Calculate total balance
  const totalBalance = allStudents.reduce((sum, student) => sum + student.sudah_bayar, 0);

  return `Kas Kelas:
Terkumpul: Rp ${totalBalance.toLocaleString('id-ID')}
Lunas: ${paidCount} | Kurang: ${kurangCount} | Belum: ${unpaidCount}`;
}

async function getPaidStudents(): Promise<string> {
  const { data: paidStudents, error } = await supabase
    .from('kas_siswa')
    .select('nama_siswa')
    .eq('status', 'Lunas');

  if (error || !paidStudents) {
    return 'Gagal mengambil data siswa lunas.';
  }

  if (paidStudents.length === 0) {
    return 'Belum ada yang lunas.';
  }

  const studentList = paidStudents
    .map((student, index) => `${index + 1}. ${student.nama_siswa}`)
    .join('\n');

  return `Siswa Lunas:\n${studentList}`;
}

async function getUnpaidStudents(): Promise<string> {
  const { data: unpaidStudents, error } = await supabase
    .from('kas_siswa')
    .select('nama_siswa, sudah_bayar')
    .eq('status', 'Belum Bayar');

  if (error || !unpaidStudents) {
    return 'Gagal mengambil data siswa belum bayar.';
  }

  if (unpaidStudents.length === 0) {
    return 'Semua sudah bayar!';
  }

  // Calculate dynamic total_wajib_bayar for each student
  const today = getCurrentWIBTime();
  const totalPayableWeeks = calculatePayableWeeks(getKasPeriodStart(), today);

  const studentList = unpaidStudents
    .map((student, index) => {
      const dynamicTotalWajibBayar = totalPayableWeeks * 5000;
      const tunggakan = dynamicTotalWajibBayar - student.sudah_bayar;
      const mingguTunggakan = Math.floor(tunggakan / 5000);
      const tunggakanText = mingguTunggakan > 0 ? ` (Nunggak ${mingguTunggakan} minggu)` : '';
      return `${index + 1}. ${student.nama_siswa}${tunggakanText}`;
    })
    .join('\n');

  return `Daftar Siswa Belum Bayar Minggu Ini:\n${studentList}`;
}

async function getStudentStatus(studentName: string): Promise<string> {
  // Get student data
  const { data: student, error: studentError } = await supabase
    .from('kas_siswa')
    .select('*')
    .ilike('nama_siswa', `%${studentName}%`)
    .single();

  if (studentError || !student) {
    return `Siswa "${studentName}" tidak ditemukan.`;
  }

  // Calculate dynamic total_wajib_bayar
  const today = getCurrentWIBTime();
  const totalPayableWeeks = calculatePayableWeeks(getKasPeriodStart(), today);
  const dynamicTotalWajibBayar = totalPayableWeeks * 5000;
  
  const statusEmoji = student.status === 'Lunas' ? '✅' : 
                     student.status === 'Kurang' ? '⚠️' : '❌';
  
  const lastPayment = student.tanggal_terakhir_bayar || 'Belum pernah';
  
  // Calculate tunggakan using dynamic calculation
  const tunggakan = dynamicTotalWajibBayar - student.sudah_bayar;
  const mingguTunggakan = Math.floor(tunggakan / 5000);
  
  let statusText = `Status Kas untuk ${student.nama_siswa}:\n`;
  
  // Determine weekly status
  const weeklyStatus = student.status === 'Lunas' ? '✅ LUNAS' : 
                      student.status === 'Kurang' ? '⚠️ KURANG' : '❌ BELUM BAYAR';
  
  statusText += `- Status Minggu Ini: ${weeklyStatus}\n`;
  
  // Add tunggakan info if exists
  if (mingguTunggakan > 0) {
    statusText += `- Tunggakan: ${mingguTunggakan} minggu (Rp ${tunggakan.toLocaleString('id-ID')})\n`;
  }
  
  statusText += `- Total Wajib Bayar: Rp ${dynamicTotalWajibBayar.toLocaleString('id-ID')}\n`;
  statusText += `- Sudah Bayar: Rp ${student.sudah_bayar.toLocaleString('id-ID')}`;

  return statusText;
}

export default kasCommand;