import { Command } from '../types';
import { findUserById } from '../utils/userUtils';
import { supabase } from '../utils/supabaseClient';

const profileCommand: Command = {
  name: 'profile',
  aliases: ['level', 'xp'],
  description: 'Menampilkan profil dan level pengguna',
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      let user;
      let displayName: string;
      
      if (args.length === 0) {
        // Show sender's profile
        user = await findUserById(senderId);
        
        if (!user) {
          // Additional debugging - check both columns directly
          const { data: directCheck } = await supabase
            .from('users')
            .select('*')
            .or(`whatsapp_id.eq.${senderId},whatsapp_lid.eq.${senderId}`)
            .limit(1);
          
          console.error(`[profile] User lookup failed for ${senderId}. Direct check result:`, directCheck);
          
          return `Profil tidak ditemukan. 
ID Anda: ${senderId}
Gunakan .debug untuk info lebih detail.`;
        }
        
        displayName = user.name || `User ${senderId.split('@')[0]}`;
      } else {
        // Show profile of mentioned user by name
        const userName = args.join(' ');
        
        // Search for user by name using direct query since findUserById searches by ID
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, whatsapp_id, whatsapp_lid, name, role, birthday, xp, level, created_at, updated_at')
          .ilike('name', `%${userName}%`)
          .single();

        if (error || !userData) {
          return `Profil "${userName}" tidak ditemukan.`;
        }
        
        user = userData;
        displayName = user.name || `User ${user.whatsapp_id?.split('@')[0] || 'Unknown'}`;
      }

      // Calculate XP and level information
      const currentXp = user.xp || 0;
      const currentLevel = user.level || 1;
      
      // Calculate XP progress within current level (0-99 for each level)
      const xpProgress = currentXp % 100;
      const xpNeeded = 100 - xpProgress;
      const xpForNextLevel = 100; // Always 100 XP per level

      // Create progress bar
      const progressBarLength = 10;
      const progressFilled = Math.floor((xpProgress / xpForNextLevel) * progressBarLength);
      const progressEmpty = progressBarLength - progressFilled;
      const progressBar = '█'.repeat(progressFilled) + '░'.repeat(progressEmpty);

      // Format role display
      const roleEmoji = getRoleEmoji(user.role);

      return `👤 Profil ${displayName}

${roleEmoji} Role: ${user.role}
⭐ Level: ${currentLevel}
✨ XP: ${xpProgress} / ${xpForNextLevel}
📊 Progress: ${progressBar}
🎯 Butuh ${xpNeeded} XP lagi untuk naik level`;

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