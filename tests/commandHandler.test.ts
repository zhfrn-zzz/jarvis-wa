import { commandHandler } from '../src/handlers/commandHandler';
import { getUserRole } from '../src/utils/userUtils';
import { addXp } from '../src/utils/xpManager';

// Mock dependencies
jest.mock('../src/utils/userUtils');
jest.mock('../src/utils/xpManager');

// Mock a simple command for testing
const mockCommand = {
  name: 'test',
  aliases: ['t'],
  description: 'Test command',
  allowedRoles: ['Owner', 'Siswa'],
  execute: jest.fn().mockResolvedValue('Test response')
};

// Mock the command loading by directly setting commands
const originalLoadCommands = (commandHandler as any).loadCommands;
beforeAll(() => {
  (commandHandler as any).commands = new Map([['test', mockCommand]]);
  (commandHandler as any).aliases = new Map([['t', 'test']]);
});

afterAll(() => {
  (commandHandler as any).loadCommands = originalLoadCommands;
});

describe('CommandHandler', () => {
  const mockGetUserRole = getUserRole as jest.MockedFunction<typeof getUserRole>;
  const mockAddXp = addXp as jest.MockedFunction<typeof addXp>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCommand.execute.mockClear();
  });

  describe('handleMessage', () => {
    it('should ignore messages not starting with dot', async () => {
      const result = await commandHandler.handleMessage('hello world', 'user@s.whatsapp.net', false);
      expect(result).toBeNull();
    });

    it('should ignore unknown commands', async () => {
      const result = await commandHandler.handleMessage('.unknown', 'user@s.whatsapp.net', false);
      expect(result).toBeNull();
    });

    it('should execute command with proper permissions', async () => {
      mockGetUserRole.mockResolvedValue('Owner');
      mockAddXp.mockResolvedValue({ leveledUp: false, oldLevel: 1, newLevel: 1, newXp: 5, xpToNext: 95 });

      const result = await commandHandler.handleMessage('.test arg1 arg2', 'user@s.whatsapp.net', false);

      expect(mockGetUserRole).toHaveBeenCalledWith('user@s.whatsapp.net');
      expect(mockCommand.execute).toHaveBeenCalledWith(['arg1', 'arg2'], 'user@s.whatsapp.net', false);
      expect(mockAddXp).toHaveBeenCalledWith('user@s.whatsapp.net', 5);
      expect(result).toBe('Test response');
    });

    it('should work with command aliases', async () => {
      mockGetUserRole.mockResolvedValue('Siswa');
      mockAddXp.mockResolvedValue({ leveledUp: false, oldLevel: 1, newLevel: 1, newXp: 5, xpToNext: 95 });

      const result = await commandHandler.handleMessage('.t', 'user@s.whatsapp.net', false);

      expect(mockCommand.execute).toHaveBeenCalledWith([], 'user@s.whatsapp.net', false);
      expect(result).toBe('Test response');
    });

    it('should deny access for insufficient permissions', async () => {
      mockGetUserRole.mockResolvedValue('UnauthorizedRole');

      const result = await commandHandler.handleMessage('.test', 'user@s.whatsapp.net', false);

      expect(mockGetUserRole).toHaveBeenCalledWith('user@s.whatsapp.net');
      expect(mockCommand.execute).not.toHaveBeenCalled();
      expect(result).toBe('Anda tidak memiliki izin untuk menggunakan command ini. Silakan hubungi admin jika Anda merasa ini adalah kesalahan.');
    });

    it('should deny access when user role is null', async () => {
      mockGetUserRole.mockResolvedValue(null);

      const result = await commandHandler.handleMessage('.test', 'user@s.whatsapp.net', false);

      expect(result).toBe('Anda tidak memiliki izin untuk menggunakan command ini. Silakan hubungi admin jika Anda merasa ini adalah kesalahan.');
    });

    it('should allow access for commands with no role restrictions', async () => {
      const openCommand = {
        name: 'open',
        description: 'Open command',
        execute: jest.fn().mockResolvedValue('Open response')
      };

      (commandHandler as any).commands.set('open', openCommand);
      mockGetUserRole.mockResolvedValue(null);
      mockAddXp.mockResolvedValue({ leveledUp: false, oldLevel: 1, newLevel: 1, newXp: 5, xpToNext: 95 });

      const result = await commandHandler.handleMessage('.open', 'user@s.whatsapp.net', false);

      expect(openCommand.execute).toHaveBeenCalled();
      expect(result).toBe('Open response');
    });

    it('should add level up message when user levels up', async () => {
      mockGetUserRole.mockResolvedValue('Owner');
      mockAddXp.mockResolvedValue({ leveledUp: true, oldLevel: 2, newLevel: 3, newXp: 105, xpToNext: 95 });

      const result = await commandHandler.handleMessage('.test', 'user@s.whatsapp.net', false);

      expect(result).toBe('Test response\n\n🎉 Selamat! Anda naik ke Level 3! (+5 XP)');
    });

    it('should not add XP for error responses', async () => {
      mockGetUserRole.mockResolvedValue('Owner');
      mockCommand.execute.mockResolvedValue('❌ Error occurred');

      const result = await commandHandler.handleMessage('.test', 'user@s.whatsapp.net', false);

      expect(mockAddXp).not.toHaveBeenCalled();
      expect(result).toBe('❌ Error occurred');
    });

    it('should not add XP for "not found" responses', async () => {
      mockGetUserRole.mockResolvedValue('Owner');
      mockCommand.execute.mockResolvedValue('Data tidak ditemukan');

      const result = await commandHandler.handleMessage('.test', 'user@s.whatsapp.net', false);

      expect(mockAddXp).not.toHaveBeenCalled();
      expect(result).toBe('Data tidak ditemukan');
    });

    it('should handle command execution errors', async () => {
      mockGetUserRole.mockResolvedValue('Owner');
      mockCommand.execute.mockRejectedValue(new Error('Command failed'));

      const result = await commandHandler.handleMessage('.test', 'user@s.whatsapp.net', false);

      expect(result).toBe('Terjadi kesalahan saat menjalankan command.');
      expect(console.error).toHaveBeenCalledWith('Error executing command test:', expect.any(Error));
    });

    it('should work in both DM and group contexts', async () => {
      mockGetUserRole.mockResolvedValue('Owner');
      mockAddXp.mockResolvedValue({ leveledUp: false, oldLevel: 1, newLevel: 1, newXp: 5, xpToNext: 95 });

      // Test DM context
      await commandHandler.handleMessage('.test', 'user@s.whatsapp.net', false);
      expect(mockCommand.execute).toHaveBeenCalledWith([], 'user@s.whatsapp.net', false);

      mockCommand.execute.mockClear();

      // Test group context
      await commandHandler.handleMessage('.test', 'user@lid', true);
      expect(mockCommand.execute).toHaveBeenCalledWith([], 'user@lid', true);
    });
  });

  describe('getCommands', () => {
    it('should return list of available commands', () => {
      const commands = commandHandler.getCommands();
      expect(commands).toContain(mockCommand);
      expect(commands.length).toBeGreaterThan(0);
    });
  });
});