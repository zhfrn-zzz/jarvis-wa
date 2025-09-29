import { Command } from '../types';
import { supabase } from '../utils/supabaseClient';
import { getUserRole, findUserById } from '../utils/userUtils';

const noteCommand: Command = {
  name: 'note',
  aliases: ['catatan', 'notes'],
  description: 'Kelola catatan kelas',
  
  async execute(args: string[], senderId: string, isGroup: boolean): Promise<string> {
    try {
      if (args.length === 0) {
        return `📝 **Note Commands:**

**Untuk Semua Orang:**
• .note list - Lihat daftar semua catatan
• .note get [id_catatan] - Baca isi catatan

**Untuk Pengurus:**
• .note add [note_id] | [title] | [isi] - Tambah catatan baru
• .note edit [note_id] | [isi_baru] - Edit isi catatan
• .note delete [note_id] - Hapus catatan

Contoh: .note get aturan_kelas`;
      }

      const subCommand = args[0].toLowerCase();
      
      switch (subCommand) {
        case 'list':
          return await listNotes();
        case 'get':
          return await getNote(args.slice(1));
        case 'add':
          return await addNote(args.slice(1), senderId);
        case 'edit':
          return await editNote(args.slice(1), senderId);
        case 'delete':
          return await deleteNote(args.slice(1), senderId);
        default:
          return '❌ Sub-command tidak dikenali. Gunakan: list, get, add, edit, atau delete';
      }

    } catch (error) {
      console.error('Error in note command:', error);
      return '❌ Terjadi kesalahan saat memproses perintah note.';
    }
  }
};

/**
 * List all available notes (accessible by everyone)
 */
async function listNotes(): Promise<string> {
  try {
    const { data: notes, error } = await supabase
      .from('class_notes')
      .select('note_id, title')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes list:', error);
      return '❌ Gagal mengambil daftar catatan.';
    }

    if (!notes || notes.length === 0) {
      return '📝 Belum ada catatan yang tersedia.';
    }

    let notesList = '📝 **Daftar Catatan Kelas:**\n\n';
    notes.forEach((note, index) => {
      notesList += `${index + 1}. **${note.title}**\n   ID: \`${note.note_id}\`\n\n`;
    });

    notesList += 'Gunakan `.note get [note_id]` untuk membaca isi catatan.';

    return notesList;

  } catch (error) {
    console.error('Error in listNotes:', error);
    return '❌ Terjadi kesalahan saat mengambil daftar catatan.';
  }
}

/**
 * Get specific note content (accessible by everyone)
 */
async function getNote(args: string[]): Promise<string> {
  try {
    if (args.length === 0) {
      return '❌ Format: .note get [note_id]\nContoh: .note get aturan_kelas';
    }

    const noteId = args[0];

    const { data: note, error } = await supabase
      .from('class_notes')
      .select('*')
      .eq('note_id', noteId)
      .single();

    if (error || !note) {
      return `❌ Catatan dengan ID "${noteId}" tidak ditemukan.`;
    }

    const createdByText = note.created_by ? `\nDibuat oleh: ${note.created_by}` : '';
    const updatedAtText = note.updated_at ? `\nTerakhir diubah: ${formatDate(note.updated_at)}` : '';

    return `📝 **${note.title}**

${note.content}

---
ID: \`${note.note_id}\`${createdByText}
Dibuat: ${formatDate(note.created_at)}${updatedAtText}`;

  } catch (error) {
    console.error('Error in getNote:', error);
    return '❌ Terjadi kesalahan saat mengambil catatan.';
  }
}

/**
 * Add new note (accessible by authorized roles only)
 */
async function addNote(args: string[], senderId: string): Promise<string> {
  try {
    // Check permissions
    const userRole = await getUserRole(senderId);
    const authorizedRoles = ['Owner', 'Admin', 'Sekretaris 1', 'Sekretaris 2'];
    
    if (!userRole || !authorizedRoles.includes(userRole)) {
      return '❌ Anda tidak memiliki izin untuk menambah catatan. Hanya pengurus yang dapat melakukan ini.';
    }

    if (args.length === 0) {
      return `❌ Format: .note add [note_id] | [title] | [isi]

Contoh: .note add aturan_kelas | Aturan Kelas TKJ C | 1. Piket wajib selesai sebelum jam 7...`;
    }

    // Parse input
    const input = args.join(' ');
    const parts = input.split('|').map(part => part.trim());

    if (parts.length !== 3) {
      return `❌ Format salah. Gunakan:
.note add [note_id] | [title] | [isi]

Contoh: .note add aturan_kelas | Aturan Kelas TKJ C | 1. Piket wajib selesai sebelum jam 7...`;
    }

    const [noteId, title, content] = parts;

    // Validate inputs
    if (!noteId || !title || !content) {
      return '❌ Note ID, title, dan isi tidak boleh kosong.';
    }

    // Check if ID already exists
    const { data: existingNote } = await supabase
      .from('class_notes')
      .select('note_id')
      .eq('note_id', noteId)
      .single();

    if (existingNote) {
      return `❌ Catatan dengan ID "${noteId}" sudah ada. Gunakan ID yang berbeda atau edit catatan yang sudah ada.`;
    }

    // Get user name for created_by field
    const user = await findUserById(senderId);
    const createdBy = user?.name || 'Unknown';

    // Insert new note
    const { data, error } = await supabase
      .from('class_notes')
      .insert({
        note_id: noteId,
        title: title,
        content: content,
        created_by: createdBy
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error adding note:', error);
      return '❌ Gagal menambahkan catatan. Silakan coba lagi.';
    }

    return `✅ **Catatan berhasil ditambahkan!**

📝 **${data.title}**
🆔 ID: \`${data.note_id}\`
👤 Dibuat oleh: ${data.created_by}
📅 Dibuat: ${formatDate(data.created_at)}

Gunakan \`.note get ${data.note_id}\` untuk melihat isi lengkap.`;

  } catch (error) {
    console.error('Error in addNote:', error);
    return '❌ Terjadi kesalahan saat menambahkan catatan.';
  }
}

/**
 * Edit existing note content (accessible by authorized roles only)
 */
async function editNote(args: string[], senderId: string): Promise<string> {
  try {
    // Check permissions
    const userRole = await getUserRole(senderId);
    const authorizedRoles = ['Owner', 'Admin', 'Sekretaris 1', 'Sekretaris 2'];
    
    if (!userRole || !authorizedRoles.includes(userRole)) {
      return '❌ Anda tidak memiliki izin untuk mengedit catatan. Hanya pengurus yang dapat melakukan ini.';
    }

    if (args.length === 0) {
      return `❌ Format: .note edit [note_id] | [isi_baru]

Contoh: .note edit aturan_kelas | 1. Piket wajib selesai sebelum jam 7...`;
    }

    // Parse input
    const input = args.join(' ');
    const parts = input.split('|').map(part => part.trim());

    if (parts.length !== 2) {
      return `❌ Format salah. Gunakan:
.note edit [note_id] | [isi_baru]

Contoh: .note edit aturan_kelas | 1. Piket wajib selesai sebelum jam 7...`;
    }

    const [noteId, newContent] = parts;

    // Validate inputs
    if (!noteId || !newContent) {
      return '❌ Note ID dan isi baru tidak boleh kosong.';
    }

    // Check if note exists
    const { data: existingNote, error: checkError } = await supabase
      .from('class_notes')
      .select('title')
      .eq('note_id', noteId)
      .single();

    if (checkError || !existingNote) {
      return `❌ Catatan dengan ID "${noteId}" tidak ditemukan.`;
    }

    // Update note content
    const { data, error } = await supabase
      .from('class_notes')
      .update({
        content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq('note_id', noteId)
      .select('*')
      .single();

    if (error) {
      console.error('Error editing note:', error);
      return '❌ Gagal mengedit catatan. Silakan coba lagi.';
    }

    return `✅ **Catatan berhasil diedit!**

📝 **${data.title}**
🆔 ID: \`${data.note_id}\`
📅 Terakhir diubah: ${formatDate(data.updated_at)}

Gunakan \`.note get ${data.note_id}\` untuk melihat isi yang sudah diperbarui.`;

  } catch (error) {
    console.error('Error in editNote:', error);
    return '❌ Terjadi kesalahan saat mengedit catatan.';
  }
}

/**
 * Delete note (accessible by authorized roles only)
 */
async function deleteNote(args: string[], senderId: string): Promise<string> {
  try {
    // Check permissions
    const userRole = await getUserRole(senderId);
    const authorizedRoles = ['Owner', 'Admin', 'Sekretaris 1', 'Sekretaris 2'];
    
    if (!userRole || !authorizedRoles.includes(userRole)) {
      return '❌ Anda tidak memiliki izin untuk menghapus catatan. Hanya pengurus yang dapat melakukan ini.';
    }

    if (args.length === 0) {
      return `❌ Format: .note delete [note_id]

Contoh: .note delete aturan_kelas`;
    }

    const noteId = args[0];

    // Check if note exists
    const { data: existingNote, error: checkError } = await supabase
      .from('class_notes')
      .select('title')
      .eq('note_id', noteId)
      .single();

    if (checkError || !existingNote) {
      return `❌ Catatan dengan ID "${noteId}" tidak ditemukan.`;
    }

    // Delete note
    const { error } = await supabase
      .from('class_notes')
      .delete()
      .eq('note_id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
      return '❌ Gagal menghapus catatan. Silakan coba lagi.';
    }

    return `✅ **Catatan berhasil dihapus!**

📝 **${existingNote.title}**
🆔 ID: \`${noteId}\`

Catatan telah dihapus dari database.`;

  } catch (error) {
    console.error('Error in deleteNote:', error);
    return '❌ Terjadi kesalahan saat menghapus catatan.';
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
}

export default noteCommand;