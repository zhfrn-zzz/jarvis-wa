import { supabase } from './supabaseClient';
import { findUserById } from './userUtils';

export interface LevelUpInfo {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newXp: number;
  xpToNext: number;
}

/**
 * Add XP to a user and handle level ups
 * @param userId - WhatsApp ID of the user
 * @param amount - Amount of XP to add
 * @returns Level up information
 */
export async function addXp(userId: string, amount: number): Promise<LevelUpInfo> {
  try {
    console.log(`[xpManager] Adding ${amount} XP to user: ${userId}`);
    
    // Find user using centralized utility
    const user = await findUserById(userId);

    if (!user) {
      console.warn(`[xpManager] Cannot add XP: User not found for ${userId}`);
      // User not found, return default info (no XP added)
      return {
        leveledUp: false,
        oldLevel: 1,
        newLevel: 1,
        newXp: 0,
        xpToNext: 100
      };
    }

    const currentXp = user.xp || 0;
    const currentLevel = user.level || 1; // Default level is 1
    const newXp = currentXp + amount;

    // Calculate new level (Level 1 = 0-99 XP, Level 2 = 100-199 XP, etc.)
    let newLevel = Math.floor(newXp / 100) + 1;
    
    // Calculate XP progress within current level
    const xpInCurrentLevel = newXp % 100;
    const xpToNext = 100 - xpInCurrentLevel;

    console.log(`[xpManager] XP calculation for ${user.name}: ${currentXp} -> ${newXp} (Level ${currentLevel} -> ${newLevel})`);

    // Update user in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        xp: newXp,
        level: newLevel
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(`[xpManager] Database error updating XP for user ${user.name}:`, {
        userId,
        error: updateError.message,
        code: updateError.code,
        details: updateError.details
      });
      return {
        leveledUp: false,
        oldLevel: currentLevel,
        newLevel: currentLevel,
        newXp: currentXp,
        xpToNext: (currentLevel + 1) * 100 - currentXp
      };
    }

    const leveledUp = newLevel > currentLevel;
    if (leveledUp) {
      console.log(`[xpManager] Level up! ${user.name} reached level ${newLevel}`);
    }

    return {
      leveledUp,
      oldLevel: currentLevel,
      newLevel: newLevel,
      newXp: newXp,
      xpToNext: xpToNext
    };

  } catch (error) {
    console.error(`[xpManager] Unexpected error adding XP:`, {
      userId,
      amount,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      leveledUp: false,
      oldLevel: 0,
      newLevel: 0,
      newXp: 0,
      xpToNext: 100
    };
  }
}

