import noteCommand from '../src/commands/note';
import { supabase } from '../src/utils/supabaseClient';
import { getUserRole, findUserById } from '../src/utils/userUtils';

// Mock dependencies
jest.mock('../src/utils/supabaseClient', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../src/utils/userUtils', () => ({
  getUserRole: jest.fn(),
  findUserById: jest.fn()
}));

describe('Note Command', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;
  const mockGetUserRole = getUserRole as jest.MockedFunction<typeof getUserRole>;
  const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Help Message', () => {
    it('should return help message when no arguments provided', async () => {
      const result = await noteCommand.execute([], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('📝 *Note Commands:*');
      expect(result).toContain('.note list');
      expect(result).toContain('.note get');
      expect(result).toContain('.note add');
      expect(result).toContain('.note edit');
      expect(result).toContain('.note delete');
    });
  });

  describe('List Notes (Public Access)', () => {
    it('should list all notes successfully', async () => {
      const mockNotes = [
        { note_id: 'aturan_kelas', title: 'Aturan Kelas TKJ C' },
        { note_id: 'jadwal_piket', title: 'Jadwal Piket Mingguan' }
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockNotes, error: null })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await noteCommand.execute(['list'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('📝 *Daftar Catatan Kelas:*');
      expect(result).toContain('*Aturan Kelas TKJ C*');
      expect(result).toContain('ID: `aturan_kelas`');
      expect(result).toContain('*Jadwal Piket Mingguan*');
      expect(result).toContain('ID: `jadwal_piket`');
      expect(mockChain.select).toHaveBeenCalledWith('note_id, title');
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle empty notes list', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await noteCommand.execute(['list'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('📝 Belum ada catatan yang tersedia.');
    });
  });

  describe('Get Note (Public Access)', () => {
    it('should get specific note successfully', async () => {
      const mockNote = {
        note_id: 'aturan_kelas',
        title: 'Aturan Kelas TKJ C',
        content: '1. Piket wajib selesai sebelum jam 7.\n2. Kas dibayar setiap Senin.',
        created_by: 'Test User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockNote, error: null })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await noteCommand.execute(['get', 'aturan_kelas'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('📝 *Aturan Kelas TKJ C*');
      expect(result).toContain('1. Piket wajib selesai sebelum jam 7.');
      expect(result).toContain('2. Kas dibayar setiap Senin.');
      expect(result).toContain('ID: `aturan_kelas`');
      expect(result).toContain('Dibuat oleh: Test User');
      expect(mockChain.eq).toHaveBeenCalledWith('note_id', 'aturan_kelas');
    });

    it('should handle note not found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const result = await noteCommand.execute(['get', 'nonexistent'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Catatan dengan ID "nonexistent" tidak ditemukan.');
    });

    it('should require note ID for get command', async () => {
      const result = await noteCommand.execute(['get'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Format: .note get [note_id]');
      expect(result).toContain('Contoh: .note get aturan_kelas');
    });
  });

  describe('Add Note (Authorized Access)', () => {
    it('should add note successfully for authorized user', async () => {
      mockGetUserRole.mockResolvedValue('Sekretaris 1');
      mockFindUserById.mockResolvedValue({
        id: 'user-uuid-123',
        name: 'Test User',
        role: 'Sekretaris 1',
        whatsapp_id: '1234567890@s.whatsapp.net'
      });

      const mockNote = {
        note_id: 'aturan_baru',
        title: 'Aturan Baru',
        content: 'Isi aturan baru',
        created_by: 'Test User',
        created_at: '2024-01-01T00:00:00Z'
      };

      const mockSelectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      const mockInsertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockNote, error: null })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectChain as any) // Check existing
        .mockReturnValueOnce(mockInsertChain as any); // Insert new

      const result = await noteCommand.execute(['add', 'aturan_baru', '|', 'Aturan Baru', '|', 'Isi aturan baru'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('✅ *Catatan berhasil ditambahkan!*');
      expect(result).toContain('📝 *Aturan Baru*');
      expect(result).toContain('🆔 ID: `aturan_baru`');
      expect(result).toContain('👤 Dibuat oleh: Test User');
      expect(mockInsertChain.insert).toHaveBeenCalledWith({
        note_id: 'aturan_baru',
        title: 'Aturan Baru',
        content: 'Isi aturan baru',
        created_by: 'Test User'
      });
    });

    it('should reject add for unauthorized user', async () => {
      mockGetUserRole.mockResolvedValue('Siswa');

      const result = await noteCommand.execute(['add', 'test', '|', 'Test', '|', 'Content'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Anda tidak memiliki izin untuk menambah catatan');
      expect(result).toContain('Hanya pengurus yang dapat melakukan ini');
    });

    it('should reject duplicate note ID', async () => {
      mockGetUserRole.mockResolvedValue('Owner');

      const mockSelectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { note_id: 'existing' }, error: null })
      };

      mockSupabase.from.mockReturnValue(mockSelectChain as any);

      const result = await noteCommand.execute(['add', 'existing', '|', 'Title', '|', 'Content'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Catatan dengan ID "existing" sudah ada');
    });

    it('should validate add command format', async () => {
      mockGetUserRole.mockResolvedValue('Owner');

      const result = await noteCommand.execute(['add', 'invalid_format'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Format salah. Gunakan:');
      expect(result).toContain('.note add [note_id] | [title] | [isi]');
    });
  });

  describe('Edit Note (Authorized Access)', () => {
    it('should edit note successfully for authorized user', async () => {
      mockGetUserRole.mockResolvedValue('Sekretaris 2');

      const mockCheckChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { title: 'Existing Note' }, error: null })
      };

      const mockUpdateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            note_id: 'test_note',
            title: 'Existing Note',
            updated_at: '2024-01-01T00:00:00Z'
          }, 
          error: null 
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCheckChain as any) // Check existing
        .mockReturnValueOnce(mockUpdateChain as any); // Update

      const result = await noteCommand.execute(['edit', 'test_note', '|', 'New content'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('✅ *Catatan berhasil diedit!*');
      expect(result).toContain('📝 *Existing Note*');
      expect(mockUpdateChain.update).toHaveBeenCalledWith({
        content: 'New content',
        updated_at: expect.any(String)
      });
    });

    it('should reject edit for unauthorized user', async () => {
      mockGetUserRole.mockResolvedValue('Siswa');

      const result = await noteCommand.execute(['edit', 'test', '|', 'New content'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Anda tidak memiliki izin untuk mengedit catatan');
    });

    it('should handle edit non-existent note', async () => {
      mockGetUserRole.mockResolvedValue('Owner');

      const mockCheckChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      mockSupabase.from.mockReturnValue(mockCheckChain as any);

      const result = await noteCommand.execute(['edit', 'nonexistent', '|', 'New content'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Catatan dengan ID "nonexistent" tidak ditemukan.');
    });
  });

  describe('Delete Note (Authorized Access)', () => {
    it('should delete note successfully for authorized user', async () => {
      mockGetUserRole.mockResolvedValue('Owner');

      const mockCheckChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { title: 'Note to Delete' }, error: null })
      };

      const mockDeleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockCheckChain as any) // Check existing
        .mockReturnValueOnce(mockDeleteChain as any); // Delete

      const result = await noteCommand.execute(['delete', 'test_note'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('✅ *Catatan berhasil dihapus!*');
      expect(result).toContain('📝 *Note to Delete*');
      expect(result).toContain('🆔 ID: `test_note`');
      expect(mockDeleteChain.delete).toHaveBeenCalled();
      expect(mockDeleteChain.eq).toHaveBeenCalledWith('note_id', 'test_note');
    });

    it('should reject delete for unauthorized user', async () => {
      mockGetUserRole.mockResolvedValue('Siswa');

      const result = await noteCommand.execute(['delete', 'test'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Anda tidak memiliki izin untuk menghapus catatan');
    });

    it('should handle delete non-existent note', async () => {
      mockGetUserRole.mockResolvedValue('Owner');

      const mockCheckChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      };

      mockSupabase.from.mockReturnValue(mockCheckChain as any);

      const result = await noteCommand.execute(['delete', 'nonexistent'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Catatan dengan ID "nonexistent" tidak ditemukan.');
    });

    it('should require note ID for delete command', async () => {
      mockGetUserRole.mockResolvedValue('Owner');

      const result = await noteCommand.execute(['delete'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Format: .note delete [note_id]');
    });
  });

  describe('Unknown Sub-command', () => {
    it('should handle unknown sub-command', async () => {
      const result = await noteCommand.execute(['unknown'], '1234567890@s.whatsapp.net', false);

      expect(result).toContain('❌ Sub-command tidak dikenali');
      expect(result).toContain('list, get, add, edit, atau delete');
    });
  });
});