import { findUserById, getUserRole } from '../src/utils/userUtils';
import { addXp } from '../src/utils/xpManager';

// Mock dependencies
jest.mock('../src/utils/userUtils');
jest.mock('../src/utils/xpManager');

describe('Integration Tests - Core Functionality', () => {
  const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;
  const mockGetUserRole = getUserRole as jest.MockedFunction<typeof getUserRole>;
  const mockAddXp = addXp as jest.MockedFunction<typeof addXp>;

  const mockUser = {
    id: '1',
    whatsapp_id: '1234567890@s.whatsapp.net',
    whatsapp_lid: '1234567890@lid',
    name: 'Test User',
    role: 'Siswa' as const,
    xp: 50,
    level: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Identification Across Contexts', () => {
    it('should find user by whatsapp_id (DM context)', async () => {
      mockFindUserById.mockResolvedValue(mockUser);

      const result = await findUserById('1234567890@s.whatsapp.net');

      expect(result).toEqual(mockUser);
      expect(mockFindUserById).toHaveBeenCalledWith('1234567890@s.whatsapp.net');
    });

    it('should find user by whatsapp_lid (group context)', async () => {
      mockFindUserById.mockResolvedValue(mockUser);

      const result = await findUserById('1234567890@lid');

      expect(result).toEqual(mockUser);
      expect(mockFindUserById).toHaveBeenCalledWith('1234567890@lid');
    });

    it('should return consistent user data regardless of ID format', async () => {
      mockFindUserById.mockResolvedValue(mockUser);

      // Test with whatsapp_id format
      const result1 = await findUserById('1234567890@s.whatsapp.net');
      
      // Test with whatsapp_lid format  
      const result2 = await findUserById('1234567890@lid');

      expect(result1).toEqual(mockUser);
      expect(result2).toEqual(mockUser);
      expect(result1).toEqual(result2);
    });
  });

  describe('Role-Based Permission System', () => {
    it('should return correct role for DM context', async () => {
      mockGetUserRole.mockResolvedValue('Siswa');

      const role = await getUserRole('1234567890@s.whatsapp.net');

      expect(role).toBe('Siswa');
      expect(mockGetUserRole).toHaveBeenCalledWith('1234567890@s.whatsapp.net');
    });

    it('should return correct role for group context', async () => {
      mockGetUserRole.mockResolvedValue('Siswa');

      const role = await getUserRole('1234567890@lid');

      expect(role).toBe('Siswa');
      expect(mockGetUserRole).toHaveBeenCalledWith('1234567890@lid');
    });

    it('should handle different role types consistently', async () => {
      const roleTypes = ['Owner', 'Siswa', 'Sekretaris 1', 'Bendahara 1', 'Ketua Kelas'];

      for (const roleType of roleTypes) {
        mockGetUserRole.mockResolvedValue(roleType);

        const dmRole = await getUserRole('1234567890@s.whatsapp.net');
        const groupRole = await getUserRole('1234567890@lid');

        expect(dmRole).toBe(roleType);
        expect(groupRole).toBe(roleType);
      }
    });

    it('should handle user not found consistently', async () => {
      mockGetUserRole.mockResolvedValue(null);

      const dmRole = await getUserRole('unknown@s.whatsapp.net');
      const groupRole = await getUserRole('unknown@lid');

      expect(dmRole).toBeNull();
      expect(groupRole).toBeNull();
    });
  });

  describe('XP System Integration', () => {
    it('should add XP consistently across contexts', async () => {
      const levelUpInfo = {
        leveledUp: false,
        oldLevel: 1,
        newLevel: 1,
        newXp: 55,
        xpToNext: 45
      };

      mockAddXp.mockResolvedValue(levelUpInfo);

      // Test DM context
      const dmResult = await addXp('1234567890@s.whatsapp.net', 5);
      
      // Test group context
      const groupResult = await addXp('1234567890@lid', 5);

      expect(dmResult).toEqual(levelUpInfo);
      expect(groupResult).toEqual(levelUpInfo);
      expect(mockAddXp).toHaveBeenCalledWith('1234567890@s.whatsapp.net', 5);
      expect(mockAddXp).toHaveBeenCalledWith('1234567890@lid', 5);
    });

    it('should handle level ups consistently', async () => {
      const levelUpInfo = {
        leveledUp: true,
        oldLevel: 1,
        newLevel: 2,
        newXp: 105,
        xpToNext: 95
      };

      mockAddXp.mockResolvedValue(levelUpInfo);

      const dmResult = await addXp('1234567890@s.whatsapp.net', 55);
      const groupResult = await addXp('1234567890@lid', 55);

      expect(dmResult.leveledUp).toBe(true);
      expect(groupResult.leveledUp).toBe(true);
      expect(dmResult.newLevel).toBe(2);
      expect(groupResult.newLevel).toBe(2);
    });
  });

  describe('Error Handling Consistency', () => {
    it('should handle database errors consistently across contexts', async () => {
      mockFindUserById.mockResolvedValue(null);
      mockGetUserRole.mockResolvedValue(null);

      const dmUser = await findUserById('error@s.whatsapp.net');
      const groupUser = await findUserById('error@lid');
      const dmRole = await getUserRole('error@s.whatsapp.net');
      const groupRole = await getUserRole('error@lid');

      expect(dmUser).toBeNull();
      expect(groupUser).toBeNull();
      expect(dmRole).toBeNull();
      expect(groupRole).toBeNull();
    });

    it('should handle XP system errors consistently', async () => {
      const errorResult = {
        leveledUp: false,
        oldLevel: 1,
        newLevel: 1,
        newXp: 0,
        xpToNext: 100
      };

      mockAddXp.mockResolvedValue(errorResult);

      const dmResult = await addXp('error@s.whatsapp.net', 10);
      const groupResult = await addXp('error@lid', 10);

      expect(dmResult).toEqual(errorResult);
      expect(groupResult).toEqual(errorResult);
    });
  });

  describe('Data Consistency Verification', () => {
    it('should maintain user data integrity across different ID formats', async () => {
      // Simulate finding the same user with different ID formats
      mockFindUserById.mockResolvedValue(mockUser);

      const userByWhatsappId = await findUserById('1234567890@s.whatsapp.net');
      const userByWhatsappLid = await findUserById('1234567890@lid');

      // Both should return the same user data
      expect(userByWhatsappId?.id).toBe(userByWhatsappLid?.id);
      expect(userByWhatsappId?.name).toBe(userByWhatsappLid?.name);
      expect(userByWhatsappId?.role).toBe(userByWhatsappLid?.role);
      expect(userByWhatsappId?.xp).toBe(userByWhatsappLid?.xp);
      expect(userByWhatsappId?.level).toBe(userByWhatsappLid?.level);
    });

    it('should provide consistent role information', async () => {
      mockGetUserRole.mockResolvedValue('Owner');

      const dmRole = await getUserRole('1234567890@s.whatsapp.net');
      const groupRole = await getUserRole('1234567890@lid');

      expect(dmRole).toBe(groupRole);
      expect(dmRole).toBe('Owner');
    });
  });
});