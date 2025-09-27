import { findUserById, getUserRole } from '../src/utils/userUtils';
import { supabase } from '../src/utils/supabaseClient';

// Mock Supabase client
jest.mock('../src/utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        or: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

describe('userUtils', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console mocks
    (console.log as jest.Mock).mockClear();
    (console.error as jest.Mock).mockClear();
    (console.warn as jest.Mock).mockClear();
  });

  describe('findUserById', () => {
    const mockUser = {
      id: 'e13fa755-0781-47d7-bef1-0d874ca45ce8',
      whatsapp_id: '1234567890@s.whatsapp.net',
      whatsapp_lid: '1234567890@lid',
      name: 'Test User',
      role: 'Siswa' as const,
      xp: 100,
      level: 2,
      birthday: '2005-01-15',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('should find user by whatsapp_id', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockUser], error: null })
      };

      const mockCountChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ count: 1, error: null })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCountChain as any)
        .mockReturnValueOnce(mockChain as any);

      const result = await findUserById('1234567890@s.whatsapp.net');

      expect(result).toEqual(mockUser);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockCountChain.or).toHaveBeenCalledWith('whatsapp_id.eq.1234567890@s.whatsapp.net,whatsapp_lid.eq.1234567890@s.whatsapp.net');
      expect(mockChain.or).toHaveBeenCalledWith('whatsapp_id.eq.1234567890@s.whatsapp.net,whatsapp_lid.eq.1234567890@s.whatsapp.net');
    });

    it('should find user by whatsapp_lid', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockUser], error: null })
      };

      const mockCountChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ count: 1, error: null })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCountChain as any)
        .mockReturnValueOnce(mockChain as any);

      const result = await findUserById('1234567890@lid');

      expect(result).toEqual(mockUser);
      expect(mockChain.or).toHaveBeenCalledWith('whatsapp_id.eq.1234567890@lid,whatsapp_lid.eq.1234567890@lid');
    });

    it('should return null when user not found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      };

      const mockCountChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ count: 0, error: null })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCountChain as any)
        .mockReturnValueOnce(mockChain as any);

      const result = await findUserById('nonexistent@s.whatsapp.net');

      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith('[userUtils] User not found in database: nonexistent@s.whatsapp.net');
    });

    it('should handle database errors gracefully', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
      };

      const mockCountChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ count: null, error: { message: 'Count error' } })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCountChain as any)
        .mockReturnValueOnce(mockChain as any);

      const result = await findUserById('test@s.whatsapp.net');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('[userUtils] Error counting users for test@s.whatsapp.net:', expect.objectContaining({ error: 'Count error' }));
      expect(console.error).toHaveBeenCalledWith('[userUtils] Database error during user lookup:', expect.objectContaining({ userId: 'test@s.whatsapp.net', error: 'Database error' }));
    });

    it('should warn when multiple users found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockUser], error: null })
      };

      const mockCountChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ count: 2, error: null })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCountChain as any)
        .mockReturnValueOnce(mockChain as any);

      const result = await findUserById('duplicate@s.whatsapp.net');

      expect(result).toEqual(mockUser);
      expect(console.warn).toHaveBeenCalledWith('[userUtils] Data integrity warning: Multiple users found for ID duplicate@s.whatsapp.net (count: 2). Using first match.');
    });

    it('should handle various user ID formats', async () => {
      const testCases = [
        '1234567890@s.whatsapp.net',
        '1234567890@lid',
        '1234567890@g.us',
        '1234567890',
        '+1234567890@s.whatsapp.net'
      ];

      for (const userId of testCases) {
        const mockChain = {
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [mockUser], error: null })
        };

        const mockCountChain = {
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockResolvedValue({ count: 1, error: null })
        };

        mockSupabase.from
          .mockReturnValueOnce(mockCountChain as any)
          .mockReturnValueOnce(mockChain as any);

        const result = await findUserById(userId);

        expect(result).toEqual(mockUser);
        expect(mockChain.or).toHaveBeenCalledWith(`whatsapp_id.eq.${userId},whatsapp_lid.eq.${userId}`);
      }
    });
  });

  describe('getUserRole', () => {
    it('should return user role when user exists', async () => {
      const mockUser = {
        id: 'e13fa755-0781-47d7-bef1-0d874ca45ce8',
        whatsapp_id: '1234567890@s.whatsapp.net',
        name: 'Test User',
        role: 'Owner' as const
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockUser], error: null })
      };

      const mockCountChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ count: 1, error: null })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCountChain as any)
        .mockReturnValueOnce(mockChain as any);

      const result = await getUserRole('1234567890@s.whatsapp.net');

      expect(result).toBe('Owner');
      expect(console.log).toHaveBeenCalledWith('[userUtils] Role lookup successful: Test User has role \'Owner\'');
    });

    it('should return null when user not found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      };

      const mockCountChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ count: 0, error: null })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCountChain as any)
        .mockReturnValueOnce(mockChain as any);

      const result = await getUserRole('nonexistent@s.whatsapp.net');

      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith('[userUtils] Role lookup failed: User not found for nonexistent@s.whatsapp.net');
    });
  });
});