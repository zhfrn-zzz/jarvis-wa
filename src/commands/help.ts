import { Command } from '../types';

const helpCommand: Command = {
    name: 'help',
    aliases: ['menu', 'bantuan'],
    description: 'Menampilkan daftar command',

    async execute(): Promise<string> {
        return `Jarvis Bot Commands:

.jadwal [hari/besok] - Jadwal pelajaran
.piket [hari/besok] - Jadwal piket  
.kas [lunas/belum/nunggak/nama] - Info kas kelas
.pr [hari/besok] - Daftar tugas
.pr add <mapel> | <tugas> | <deadline> - Tambah tugas (Sekretaris)

Contoh: .jadwal senin, .kas nunggak, .pr besok`;
    }
};

export default helpCommand;