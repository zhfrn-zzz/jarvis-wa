import profileCommand from '../src/commands/profile';
import birthdayCommand from '../src/commands/birthday';
import { findUserById } from '../src/utils/userUtils';
import { supabase } from '../src/utils/supabaseClient';

// Mock dependencies
jest.mock('../src/utils/userUtils');
jest.mock('../src/utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        ilike: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        not: jest.fn(() => Promise.resolve({ data: [], error: null })),
        or: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
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

describe('Refactored Commands', () => {
  const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Profile Command', () => {
    const mockUser = {
      id: '1',
      whatsapp_id: '1234567890@s.whatsapp.net',
      name: 'Test User',
      role: 'Siswa' as const,
      xp: 150,
      level: 2,
      birthday: '2005-01-15'
    };

    it('should display user profile for sender', async () => {
      mockFindUserById.mockResolvedValue(mockUser);

      const result = await profileCommand.execute([], '1234567890@s.whatsapp.net', false);

      expect(mockFindUserById).toHaveBeenCalledWith('1234567890@s.whatsapp.net');
      expect(result).toContain('👤 Profil Test User');
      expect(result).toContain('👨‍🎓 Role: Siswa');
      expect(result).toContain('⭐ Level: 2');
      expect(result).toContain('✨ XP: 50 / 100'); // 150 % 100 = 50
    });

    it('should display profile for mentioned user by name', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await profileCommand.execute(['Test', 'User'], '1234567890@s.whatsapp.net', false);

      expect(mockChain.ilike).toHaveBeenCalledWith('name', '%Test User%');
      expect(result).toContain('👤 Profil Test User');
    });

    it('should handle user not found', async () => {
      mockFindUserById.mockResolvedValue(null);

      // Mock direct database check
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await profileCommand.execute([], 'nonexistent@s.whatsapp.net', false);

      expect(result).toContain('Profil tidak ditemukan');
      expect(result).toContain('ID Anda: nonexistent@s.whatsapp.net');
    });

    it('should handle user search by name not found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await profileCommand.execute(['Unknown'], '1234567890@s.whatsapp.net', false);

      expect(result).toBe('Profil "Unknown" tidak ditemukan.');
    });

    it('should calculate XP progress correctly', async () => {
      const userWithHighXP = { ...mockUser, xp: 250, level: 3 };
      mockFindUserById.mockResolvedValue(userWithHighXP);

      const result = await profileCommand.execute([], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('⭐ Level: 3');
      expect(result).toContain('✨ XP: 50 / 100'); // 250 % 100 = 50
      expect(result).toContain('🎯 Butuh 50 XP lagi untuk naik level');
    });

    it('should work in both DM and group contexts', async () => {
      mockFindUserById.mockResolvedValue(mockUser);

      // Test DM context
      const dmResult = await profileCommand.execute([], '1234567890@s.whatsapp.net', false);
      expect(dmResult).toContain('👤 Profil Test User');

      // Test group context
      const groupResult = await profileCommand.execute([], '1234567890@lid', true);
      expect(groupResult).toContain('👤 Profil Test User');
    });
  });

  describe('Birthday Command', () => {
    const mockUser = {
      id: '1',
      whatsapp_id: '1234567890@s.whatsapp.net',
      name: 'Test User',
      role: 'Siswa' as const
    };

    it('should show help when no arguments provided', async () => {
      const result = await birthdayCommand.execute([], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('Birthday Commands:');
      expect(result).toContain('.birthday set DD-MM-YYYY');
      expect(result).toContain('.birthday list');
    });

    it('should set birthday successfully', async () => {
      mockFindUserById.mockResolvedValue(mockUser);

      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockUser, birthday: '2005-01-15' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await birthdayCommand.execute(['set', '15-01-2005'], '1234567890@s.whatsapp.net', false);

      expect(mockFindUserById).toHaveBeenCalledWith('1234567890@s.whatsapp.net');
      expect(mockChain.update).toHaveBeenCalledWith({ birthday: '2005-01-15' });
      expect(result).toContain('🎂 Birthday berhasil diset!');
      expect(result).toContain('Tanggal Lahir: 15-01-2005');
    });

    it('should validate date format', async () => {
      const result = await birthdayCommand.execute(['set', 'invalid-date'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('Format tanggal salah');
      expect(result).toContain('DD-MM-YYYY');
    });

    it('should validate date values', async () => {
      const testCases = [
        ['set', '32-01-2005'], // Invalid day
        ['set', '15-13-2005'], // Invalid month
        ['set', '15-01-1800'], // Invalid year (too old)
        ['set', '15-01-2030']  // Invalid year (future)
      ];

      for (const args of testCases) {
        const result = await birthdayCommand.execute(args, '1234567890@s.whatsapp.net', false);
        expect(result).toMatch(/(Hari tidak valid|Bulan tidak valid|Tahun tidak valid)/);
      }
    });

    it('should handle user not found for birthday setting', async () => {
      mockFindUserById.mockResolvedValue(null);

      const result = await birthdayCommand.execute(['set', '15-01-2005'], '1234567890@s.whatsapp.net', false);

      expect(result).toBe('User tidak ditemukan. Pastikan Anda terdaftar di sistem.');
    });

    it('should list birthdays for current month', async () => {
      const mockUsers = [
        { name: 'User 1', birthday: '2005-01-10', whatsapp_id: 'user1@s.whatsapp.net' },
        { name: 'User 2', birthday: '2005-01-10', whatsapp_id: 'user2@s.whatsapp.net' }
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: mockUsers, error: null })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      // Mock current date to January
      const originalDate = Date;
      global.Date = jest.fn(() => new originalDate('2024-01-10')) as any;
      Object.setPrototypeOf(global.Date, originalDate);

      const result = await birthdayCommand.execute(['list'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('🎂 Ulang Tahun Bulan Januari:');
      expect(result).toContain('🎉 10-01 - User 1 (HARI INI!)');
      expect(result).toContain('🎉 10-01 - User 2 (HARI INI!)');

      // Restore original Date
      global.Date = originalDate;
    });

    it('should handle database errors gracefully', async () => {
      mockFindUserById.mockResolvedValue(mockUser);

      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await birthdayCommand.execute(['set', '15-01-2000'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('Terjadi kesalahan saat menyimpan birthday');
    });
  });
});