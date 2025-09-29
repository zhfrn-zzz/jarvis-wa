export interface User {
  id: string;
  whatsapp_id?: string;
  whatsapp_lid?: string;
  name: string;
  role: 'Owner' | 'Siswa' | 'Sekretaris 1' | 'Sekretaris 2' | 'Bendahara 1' | 'Bendahara 2' | 'Ketua Kelas' | 'Wakil Ketua';
  birthday?: string;
  xp?: number;
  level?: number;
  created_at?: string;
  updated_at?: string;
}

export interface JadwalKelas {
  id: number;
  Hari: string;
  Jam: string;
  'Mata Pelajaran': string;
  Guru: string;
  Ruang: string;
}

export interface Piket {
  id: number;
  hari: string;
  nama_siswa: string[];
}

export interface KasSiswa {
  id: string;
  nama_siswa: string;
  total_wajib_bayar: number;
  sudah_bayar: number;
  tanggal_terakhir_bayar?: string;
  status: string;
  last_update?: string;
}

export interface KasHistory {
  id: number;
  nama_siswa: string;
  jumlah: number;
  tanggal: string;
  minggu_ke: number;
  created_at?: string;
}

export interface Homework {
  id: number;
  mapel: string;
  deskripsi: string;
  deadline: string;
  created_at?: string;
}

export interface Settings {
  key: string;
  value: string;
}

export interface ClassNote {
  id: number;
  note_id: string;
  title: string;
  content: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  allowedRoles?: string[];
  execute: (args: string[], senderId: string, isGroup: boolean) => Promise<string>;
}