import { Command } from '../types';

const helpCommand: Command = {
    name: 'help',
    aliases: ['menu', 'bantuan'],
    description: 'Menampilkan daftar command',

    async execute(): Promise<string> {
        return `Jarvis Bot Commands:

.daftar <kode> | <DD-MM-YYYY> - Daftar akun baru
.jadwal [hari/besok] - Jadwal pelajaran
.piket [hari/besok] - Jadwal piket
.kas [lunas/belum/nunggak/nama] - Info kas kelas
.pr [hari/besok] - Daftar tugas
.pr add <mapel> | <tugas> | <deadline> - Tambah tugas (Sekretaris)
.profile [nama] - Lihat profil dan level
.setname <nama> - Set nama lengkap Anda
.birthday set/list - Kelola ulang tahun
.sticker/.s/.stiker - Konversi gambar/video ke stiker
.tophoto/.toimg - Konversi stiker ke gambar (reply stiker)

Contoh: .daftar ABC950 | 15-08-2005`;
    }
};

export default helpCommand;