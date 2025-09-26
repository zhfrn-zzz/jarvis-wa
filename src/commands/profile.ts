import { Command } from '../types';
import { getUserProfile, getUserProfileByName } from '../utils/xpManager';

const profileCommand: Command = {
  name: 'profile',
  aliases: ['level', 'xp'],
  description: 'Menampilkan profil dan level pengguna',
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      let profile;
      
      if (args.length === 0) {
        // Show sender's profile
        profile = await getUserProfile(senderId);
        
        if (!profile) {
          return `Profil tidak ditemukan. 
ID Anda: ${senderId}
Gunakan .debug untuk info lebih detail.`;
        }
      } else {
        // Show profile of mentioned user
        const userName = args.join(' ');
        profile = await getUserProfileByName(userName);
        
        if (!profile) {
          return `Profil "${userName}" tidak ditemukan.`;
        }
      }

      // Create progress bar
      const progressBarLength = 10;
      const progressFilled = Math.floor((profile.xpProgress / profile.xpForNextLevel) * progressBarLength);
      const progressEmpty = progressBarLength - progressFilled;
      const progressBar = '█'.repeat(progressFilled) + '░'.repeat(progressEmpty);

      // Format role display
      const roleEmoji = getRoleEmoji(profile.role);

      return `👤 Profil ${profile.name}

${roleEmoji} Role: ${profile.role}
⭐ Level: ${profile.level}
✨ XP: ${profile.xpProgress} / ${profile.xpForNextLevel}
📊 Progress: ${progressBar}
🎯 Butuh ${profile.xpNeeded} XP lagi untuk naik level`;

    } catch (error) {
      console.error('Error in profile command:', error);
      return 'Terjadi kesalahan saat mengambil profil.';
    }
  }
};

function getRoleEmoji(role: string): string {
  const roleEmojis: { [key: string]: string } = {
    'Owner': '👑',
    'Sekretaris 1': '📝',
    'Sekretaris 2': '📝',
    'Bendahara 1': '💰',
    'Bendahara 2': '💰',
    'Ketua Kelas': '🎖️',
    'Wakil Ketua': '🏅',
    'Siswa': '👨‍🎓'
  };
  
  return roleEmojis[role] || '👤';
}

export default profileCommand;