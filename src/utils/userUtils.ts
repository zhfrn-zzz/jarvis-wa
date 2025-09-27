import { supabase } from './supabaseClient';
import { User } from '../types';

/**
 * Centralized user lookup function that searches both whatsapp_id and whatsapp_lid columns
 * @param userId - The WhatsApp ID to search for
 * @returns Complete user object if found, null if not found
 */
export async function findUserById(userId: string): Promise<User | null> {
  try {
    // Debug logging for user lookup attempts
    console.log(`[userUtils] Looking up user with ID: ${userId}`);
    
    // Check for multiple matches to detect potential data issues
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .or(`whatsapp_id.eq.${userId},whatsapp_lid.eq.${userId}`);

    if (countError) {
      console.error(`[userUtils] Error counting users for ${userId}:`, {
        error: countError.message,
        code: countError.code,
        details: countError.details
      });
    } else if (count && count > 1) {
      console.warn(`[userUtils] Data integrity warning: Multiple users found for ID ${userId} (count: ${count}). Using first match.`);
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('id, whatsapp_id, whatsapp_lid, name, role, birthday, xp, level, created_at, updated_at')
      .or(`whatsapp_id.eq.${userId},whatsapp_lid.eq.${userId}`)
      .limit(1);

    if (error) {
      console.error(`[userUtils] Database error during user lookup:`, {
        userId,
        error: error.message,
        code: error.code,
        details: error.details
      });
      return null;
    }

    if (!data || data.length === 0) {
      console.log(`[userUtils] User not found in database: ${userId}`);
      return null;
    }

    // Take the first result if multiple matches
    const user = Array.isArray(data) ? data[0] : data;
    console.log(`[userUtils] User lookup successful: ${user.name || 'Unknown'} (DB ID: ${user.id})`);
    return user;

  } catch (error) {
    console.error(`[userUtils] Unexpected error during user lookup:`, {
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

/**
 * Quick role lookup for permission checking
 * @param userId - The WhatsApp ID to search for
 * @returns User role if found, null if not found
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    console.log(`[userUtils] Role lookup requested for user: ${userId}`);
    
    const user = await findUserById(userId);
    
    if (!user) {
      console.log(`[userUtils] Role lookup failed: User not found for ${userId}`);
      return null;
    }

    console.log(`[userUtils] Role lookup successful: ${user.name || 'Unknown'} has role '${user.role}'`);
    return user.role;

  } catch (error) {
    console.error(`[userUtils] Error during role lookup:`, {
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}