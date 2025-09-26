import * as cron from 'node-cron';
import { supabase } from '../utils/supabaseClient';
import { getCurrentWIBTime, formatWIBDate } from '../utils/time';
import { addXp } from '../utils/xpManager';

export class BirthdayChecker {
  private sock: any;

  constructor(sock: any) {
    this.sock = sock;
  }

  start(): void {
    // Schedule for 08:00 WIB every day
    cron.schedule('0 8 * * *', async () => {
      await this.checkBirthdays();
    }, {
      timezone: 'Asia/Jakarta'
    });

    console.log('🎂 Birthday checker scheduler started (08:00 WIB)');
  }

  /**
   * Public method to manually trigger birthday check
   * Can be called from test commands
   */
  public async sendBirthdayWishes(): Promise<string> {
    try {
      const result = await this.checkBirthdays();
      return result || 'Birthday check completed successfully';
    } catch (error) {
      console.error('Error in manual birthday check:', error);
      return `Error: ${error}`;
    }
  }

  private async checkBirthdays(): Promise<string | void> {
    try {
      const today = getCurrentWIBTime();
      const todayDay = today.getDate().toString().padStart(2, '0');
      const todayMonth = (today.getMonth() + 1).toString().padStart(2, '0');
      const todayPattern = `${todayDay}-${todayMonth}-%`;

      console.log(`🎂 Checking birthdays for ${todayDay}-${todayMonth}`);

      // Find users with birthday today
      // Get all users with birthdays and filter in JavaScript
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('name, birthday, whatsapp_id')
        .not('birthday', 'is', null);

      if (error) {
        console.error('Error fetching users:', error);
        return 'Error fetching users from database';
      }

      // Filter users with birthday today
      const birthdayUsers = allUsers?.filter(user => {
        if (!user.birthday) return false;
        const birthDate = new Date(user.birthday);
        const birthDay = birthDate.getDate().toString().padStart(2, '0');
        const birthMonth = (birthDate.getMonth() + 1).toString().padStart(2, '0');
        return birthDay === todayDay && birthMonth === todayMonth;
      }) || [];

      if (birthdayUsers.length === 0) {
        console.log('No birthdays today');
        return 'No birthdays found for today';
      }

      // Get announcement group ID
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'announcementGroupId')
        .single();

      if (settingsError || !settings) {
        console.error('❌ Announcement group ID not found in settings');
        return 'Error: Announcement group ID not found in settings';
      }

      const groupId = settings.value;

      // Process each birthday user
      for (const user of birthdayUsers) {
        await this.celebrateBirthday(user, groupId);
      }

      return `Birthday wishes sent to ${birthdayUsers.length} user(s): ${birthdayUsers.map(u => u.name).join(', ')}`;

    } catch (error) {
      console.error('❌ Error in birthday checker:', error);
      return `Error in birthday checker: ${error}`;
    }
  }

  private async celebrateBirthday(user: any, groupId: string): Promise<void> {
    try {
      // Calculate age
      const birthDate = new Date(user.birthday);
      const birthYear = birthDate.getFullYear();
      const currentYear = getCurrentWIBTime().getFullYear();
      const age = currentYear - birthYear;

      // Create birthday message
      const birthdayMessage = this.createBirthdayMessage(user.name, age, user.whatsapp_id);

      // Send birthday message to group
      await this.sock.sendMessage(groupId, { text: birthdayMessage });

      // Give birthday bonus XP
      if (user.whatsapp_id) {
        const levelInfo = await addXp(user.whatsapp_id, 100);
        
        console.log(`🎂 Birthday bonus given to ${user.name}: +100 XP`);
        
        // Send personal birthday message with XP info
        const personalMessage = `🎉 Selamat Ulang Tahun, ${user.name}!

🎁 Kamu mendapat hadiah birthday:
✨ +100 XP Bonus!
${levelInfo.leveledUp ? `🎊 LEVEL UP! Sekarang Level ${levelInfo.newLevel}!` : ''}

Semoga panjang umur dan sehat selalu! 🎂`;

        try {
          await this.sock.sendMessage(user.whatsapp_id, { text: personalMessage });
        } catch (dmError) {
          console.log(`Could not send DM to ${user.name}, probably not in contacts`);
        }
      }

    } catch (error) {
      console.error(`Error celebrating birthday for ${user.name}:`, error);
    }
  }

  private createBirthdayMessage(name: string, age: number, whatsappId?: string): string {
    const mentionText = whatsappId ? `@${whatsappId.split('@')[0]}` : name;
    
    const birthdayEmojis = ['🎉', '🎂', '🎈', '🎁', '🎊', '🥳'];
    const randomEmoji = birthdayEmojis[Math.floor(Math.random() * birthdayEmojis.length)];

    return `${randomEmoji} *SELAMAT ULANG TAHUN!* ${randomEmoji}

🎂 Hari ini adalah hari spesial untuk ${mentionText}!
🎈 Selamat ulang tahun yang ke-${age}!

🎁 Hadiah dari Jarvis Bot:
✨ +100 XP Bonus Birthday!

Semoga panjang umur, sehat selalu, dan sukses dalam segala hal! 

Dari seluruh keluarga besar X TKJ C 💙

_Pesan otomatis dari Jarvis Bot_ 🤖`;
  }
}