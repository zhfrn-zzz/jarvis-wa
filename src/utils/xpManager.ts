import { supabase } from './supabaseClient';

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
    // Find user by whatsapp_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, xp, level')
      .eq('whatsapp_id', userId)
      .single();

    if (userError || !user) {
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

    // Update user in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        xp: newXp,
        level: newLevel
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user XP:', updateError);
      return {
        leveledUp: false,
        oldLevel: currentLevel,
        newLevel: currentLevel,
        newXp: currentXp,
        xpToNext: (currentLevel + 1) * 100 - currentXp
      };
    }

    return {
      leveledUp: newLevel > currentLevel,
      oldLevel: currentLevel,
      newLevel: newLevel,
      newXp: newXp,
      xpToNext: xpToNext
    };

  } catch (error) {
    console.error('Error in addXp:', error);
    return {
      leveledUp: false,
      oldLevel: 0,
      newLevel: 0,
      newXp: 0,
      xpToNext: 100
    };
  }
}

/**
 * Get user profile information
 * @param userId - WhatsApp ID of the user
 * @returns User profile data
 */
export async function getUserProfile(userId: string) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('name, role, xp, level, whatsapp_id')
      .eq('whatsapp_id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    const currentXp = user.xp || 0;
    const currentLevel = user.level || 1;
    
    // Calculate XP progress within current level (0-99 for each level)
    const xpProgress = currentXp % 100;
    const xpNeeded = 100 - xpProgress;

    // Handle empty nama
    const displayName = user.name || `User ${userId.split('@')[0]}`;

    return {
      name: displayName,
      role: user.role,
      level: currentLevel,
      xp: currentXp,
      xpProgress: xpProgress,
      xpNeeded: xpNeeded,
      xpForNextLevel: 100 // Always 100 XP per level
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Find user by name (for profile command with arguments)
 * @param userName - Name to search for
 * @returns User profile data
 */
export async function getUserProfileByName(userName: string) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('name, role, xp, level, whatsapp_id')
      .ilike('name', `%${userName}%`)
      .single();

    if (error || !user) {
      return null;
    }

    const currentXp = user.xp || 0;
    const currentLevel = user.level || 1;
    
    // Calculate XP progress within current level (0-99 for each level)
    const xpProgress = currentXp % 100;
    const xpNeeded = 100 - xpProgress;

    // Handle empty name
    const displayName = user.name || `User ${user.whatsapp_id?.split('@')[0] || 'Unknown'}`;

    return {
      name: displayName,
      role: user.role,
      level: currentLevel,
      xp: currentXp,
      xpProgress: xpProgress,
      xpNeeded: xpNeeded,
      xpForNextLevel: 100
    };
  } catch (error) {
    console.error('Error getting user profile by name:', error);
    return null;
  }
}