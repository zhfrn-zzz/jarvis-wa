import { readdirSync } from 'fs';
import { join } from 'path';
import { addXp } from '../utils/xpManager';
import { getUserRole } from '../utils/userUtils';
import { Command } from '../types';

class CommandHandler {
  private commands: Map<string, Command> = new Map();
  private aliases: Map<string, string> = new Map();

  constructor() {
    this.loadCommands();
  }

  private loadCommands(): void {
    const commandsPath = join(__dirname, '../commands');
    
    try {
      const commandFiles = readdirSync(commandsPath).filter(file => 
        file.endsWith('.ts') || file.endsWith('.js')
      );

      for (const file of commandFiles) {
        try {
          const commandModule = require(join(commandsPath, file));
          const command: Command = commandModule.default || commandModule;
          
          if (command && command.name && typeof command.execute === 'function') {
            this.commands.set(command.name, command);
            
            // Register aliases
            if (command.aliases) {
              for (const alias of command.aliases) {
                this.aliases.set(alias, command.name);
              }
            }
            
            console.log(`✅ Loaded command: ${command.name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to load command from ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load commands directory:', error);
    }
  }



  private hasPermission(userRole: string | null, allowedRoles?: string[]): boolean {
    if (!allowedRoles || allowedRoles.length === 0) {
      return true; // No restrictions
    }

    if (!userRole) {
      return false; // No role found
    }

    return allowedRoles.includes(userRole);
  }

  async handleMessage(message: string, senderId: string, isGroup: boolean, fullMessage?: any): Promise<string | null> {
    if (!message.startsWith('.')) {
      return null;
    }

    const parts = message.slice(1).trim().split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Check if command exists (either by name or alias)
    const actualCommandName = this.aliases.get(commandName) || commandName;
    const command = this.commands.get(actualCommandName);

    if (!command) {
      return null; // Command not found, ignore silently
    }

    // Check permissions
    const userRole = await getUserRole(senderId);
    
    if (!this.hasPermission(userRole, command.allowedRoles)) {
      return 'Anda tidak memiliki izin untuk menggunakan command ini. Silakan hubungi admin jika Anda merasa ini adalah kesalahan.';
    }

    try {
      const response = await command.execute(args, senderId, isGroup, fullMessage);

      // Add XP for successful command execution
      if (response && !response.startsWith('❌') && !response.includes('tidak ditemukan')) {
        const levelInfo = await addXp(senderId, 5);
        
        // If user leveled up, add congratulations message
        if (levelInfo.leveledUp) {
          const levelUpMessage = `\n\n🎉 Selamat! Anda naik ke Level ${levelInfo.newLevel}! (+5 XP)`;
          return response + levelUpMessage;
        }
      }
      
      return response;
    } catch (error) {
      console.error(`Error executing command ${command.name}:`, error);
      return 'Terjadi kesalahan saat menjalankan command.';
    }
  }

  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }
}

export const commandHandler = new CommandHandler();