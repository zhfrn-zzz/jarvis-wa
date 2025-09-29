import daftarCommand from '../src/commands/daftar';
import { supabase } from '../src/utils/supabaseClient';

// Mock supabase
jest.mock('../src/utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe('Daftar Command - New Logic', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Registration Code Validation', () => {
    it('should return error for invalid registration code', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await daftarCommand.execute(['INVALID123', '|', '15-08-2005'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Kode pendaftaran tidak valid.');
    });

    it('should proceed with valid registration code', async () => {
      const mockCodeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { student_name: 'Test Student' }, 
          error: null 
        })
      };

      const mockUserChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Student not found' } 
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCodeChain as any) // registration_codes query
        .mockReturnValueOnce(mockUserChain as any); // users query

      const result = await daftarCommand.execute(['VALID123', '|', '15-08-2005'], '1234567890@s.whatsapp.net', false);

      expect(mockCodeChain.select).toHaveBeenCalledWith('student_name');
      expect(mockCodeChain.eq).toHaveBeenCalledWith('code', 'VALID123');
    });
  });

  describe('Private ID Registration', () => {
    it('should register private ID when whatsapp_id is empty', async () => {
      const mockCodeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { student_name: 'Test Student' }, 
          error: null 
        })
      };

      const mockUserSelectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'user-uuid-123',
            name: 'Test Student',
            role: 'Siswa',
            whatsapp_id: null, // Empty - can register
            whatsapp_lid: null
          }, 
          error: null 
        })
      };

      const mockUserUpdateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { name: 'Test Student', role: 'Siswa' }, 
          error: null 
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCodeChain as any) // registration_codes query
        .mockReturnValueOnce(mockUserSelectChain as any) // users select query
        .mockReturnValueOnce(mockUserUpdateChain as any); // users update query

      const result = await daftarCommand.execute(['VALID123', '|', '15-08-2005'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('✅ ID Pribadi berhasil ditautkan!');
      expect(result).toContain('Jika Anda belum mendaftar dari grup');
      expect(mockUserUpdateChain.update).toHaveBeenCalledWith({
        whatsapp_id: '1234567890@s.whatsapp.net',
        birthday: '2005-08-15'
      });
    });

    it('should reject private ID registration when whatsapp_id already exists', async () => {
      const mockCodeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { student_name: 'Test Student' }, 
          error: null 
        })
      };

      const mockUserSelectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'user-uuid-123',
            name: 'Test Student',
            role: 'Siswa',
            whatsapp_id: '9876543210@s.whatsapp.net', // Already registered
            whatsapp_lid: null
          }, 
          error: null 
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCodeChain as any) // registration_codes query
        .mockReturnValueOnce(mockUserSelectChain as any); // users select query

      const result = await daftarCommand.execute(['VALID123', '|', '15-08-2005'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ ID Pribadi Anda sudah terdaftar.');
      expect(result).toContain('Jika Anda belum mendaftar dari grup');
    });
  });

  describe('Group ID Registration', () => {
    it('should register group ID when whatsapp_lid is empty', async () => {
      const mockCodeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { student_name: 'Test Student' }, 
          error: null 
        })
      };

      const mockUserSelectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'user-uuid-123',
            name: 'Test Student',
            role: 'Siswa',
            whatsapp_id: null,
            whatsapp_lid: null // Empty - can register
          }, 
          error: null 
        })
      };

      const mockUserUpdateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { name: 'Test Student', role: 'Siswa' }, 
          error: null 
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCodeChain as any) // registration_codes query
        .mockReturnValueOnce(mockUserSelectChain as any) // users select query
        .mockReturnValueOnce(mockUserUpdateChain as any); // users update query

      const result = await daftarCommand.execute(['VALID123', '|', '15-08-2005'], '1234567890@lid', true);

      expect(result).toContain('✅ ID Grup berhasil ditautkan!');
      expect(result).toContain('Jika Anda belum mendaftar dari DM');
      expect(mockUserUpdateChain.update).toHaveBeenCalledWith({
        whatsapp_lid: '1234567890@lid',
        birthday: '2005-08-15'
      });
    });

    it('should reject group ID registration when whatsapp_lid already exists', async () => {
      const mockCodeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { student_name: 'Test Student' }, 
          error: null 
        })
      };

      const mockUserSelectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'user-uuid-123',
            name: 'Test Student',
            role: 'Siswa',
            whatsapp_id: null,
            whatsapp_lid: '9876543210@lid' // Already registered
          }, 
          error: null 
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCodeChain as any) // registration_codes query
        .mockReturnValueOnce(mockUserSelectChain as any); // users select query

      const result = await daftarCommand.execute(['VALID123', '|', '15-08-2005'], '1234567890@lid', true);

      expect(result).toContain('❌ ID Grup Anda sudah terdaftar.');
      expect(result).toContain('Jika Anda belum mendaftar dari DM');
    });
  });

  describe('Input Validation', () => {
    it('should return help message when no arguments provided', async () => {
      const result = await daftarCommand.execute([], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('Format pendaftaran:');
      expect(result).toContain('.daftar [KODE UNIK] | [Tanggal Lahir DD-MM-YYYY]');
      expect(result).toContain('Anda dapat menggunakan kode yang sama');
    });

    it('should validate birthday format', async () => {
      const result = await daftarCommand.execute(['VALID123', '|', 'invalid-date'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Format tanggal lahir salah');
    });

    it('should handle unknown ID format', async () => {
      const mockCodeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { student_name: 'Test Student' }, 
          error: null 
        })
      };

      const mockUserSelectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'user-uuid-123',
            name: 'Test Student',
            role: 'Siswa',
            whatsapp_id: null,
            whatsapp_lid: null
          }, 
          error: null 
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCodeChain as any)
        .mockReturnValueOnce(mockUserSelectChain as any);

      const result = await daftarCommand.execute(['VALID123', '|', '15-08-2005'], 'unknown-format-id', false);

      expect(result).toContain('❌ Format ID tidak dikenali');
      expect(result).toContain('Chat pribadi (ID berakhiran @s.whatsapp.net)');
      expect(result).toContain('Grup WhatsApp (ID berakhiran @lid)');
    });
  });
});