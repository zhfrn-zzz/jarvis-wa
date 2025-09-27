import { addXp } from '../src/utils/xpManager';
import { findUserById } from '../src/utils/userUtils';
import { supabase } from '../src/utils/supabaseClient';

// Mock dependencies
jest.mock('../src/utils/userUtils');
jest.mock('../src/utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }))
    }))
  }
}));

describe('XP Manager', () => {
  const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addXp', () => {
    const mockUser = {
      id: 'e13fa755-0781-47d7-bef1-0d874ca45ce8',
      whatsapp_id: '1234567890@s.whatsapp.net',
      name: 'Test User',
      role: 'Siswa' as const,
      xp: 95,
      level: 1
    };

    it('should add XP without leveling up', async () => {
      mockFindUserById.mockResolvedValue(mockUser);
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockUser, xp: 100, level: 1 },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await addXp('1234567890@s.whatsapp.net', 5);

      expect(mockFindUserById).toHaveBeenCalledWith('1234567890@s.whatsapp.net');
      expect(mockChain.update).toHaveBeenCalledWith({ xp: 100, level: 2 });
      expect(result).toEqual({
        leveledUp: true,
        oldLevel: 1,
        newLevel: 2,
        newXp: 100,
        xpToNext: 100
      });
    });

    it('should add XP and level up when threshold reached', async () => {
      mockFindUserById.mockResolvedValue(mockUser);
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockUser, xp: 105, level: 2 },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await addXp('1234567890@s.whatsapp.net', 10);

      expect(mockChain.update).toHaveBeenCalledWith({ xp: 105, level: 2 });
      expect(result).toEqual({
        leveledUp: true,
        oldLevel: 1,
        newLevel: 2,
        newXp: 105,
        xpToNext: 95
      });
    });

    it('should handle multiple level ups', async () => {
      const lowLevelUser = { ...mockUser, xp: 50, level: 1 };
      mockFindUserById.mockResolvedValue(lowLevelUser);
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...lowLevelUser, xp: 250, level: 3 },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await addXp('1234567890@s.whatsapp.net', 200);

      expect(mockChain.update).toHaveBeenCalledWith({ xp: 250, level: 3 });
      expect(result).toEqual({
        leveledUp: true,
        oldLevel: 1,
        newLevel: 3,
        newXp: 250,
        xpToNext: 50
      });
    });

    it('should handle user not found', async () => {
      mockFindUserById.mockResolvedValue(null);

      const result = await addXp('nonexistent@s.whatsapp.net', 10);

      expect(result).toEqual({
        leveledUp: false,
        oldLevel: 1,
        newLevel: 1,
        newXp: 0,
        xpToNext: 100
      });
    });

    it('should handle database errors', async () => {
      mockFindUserById.mockResolvedValue(mockUser);
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await addXp('1234567890@s.whatsapp.net', 10);

      expect(result).toEqual({
        leveledUp: false,
        oldLevel: 1,
        newLevel: 1,
        newXp: 95,
        xpToNext: 105
      });
      expect(console.error).toHaveBeenCalledWith('[xpManager] Database error updating XP for user Test User:', expect.objectContaining({ userId: '1234567890@s.whatsapp.net', error: 'Database error' }));
    });

    it('should handle users with no initial XP/level', async () => {
      const newUser = {
        id: 'f24fa755-0781-47d7-bef1-0d874ca45ce9',
        whatsapp_id: '1234567890@s.whatsapp.net',
        name: 'New User',
        role: 'Siswa' as const
      };
      
      mockFindUserById.mockResolvedValue(newUser);
      
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...newUser, xp: 10, level: 1 },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await addXp('1234567890@s.whatsapp.net', 10);

      expect(mockChain.update).toHaveBeenCalledWith({ xp: 10, level: 1 });
      expect(result).toEqual({
        leveledUp: false,
        oldLevel: 1,
        newLevel: 1,
        newXp: 10,
        xpToNext: 90
      });
    });
  });

});