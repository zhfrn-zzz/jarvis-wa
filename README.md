# Jarvis Bot - WhatsApp Assistant for X TKJ C

A professional WhatsApp bot built with TypeScript and Baileys to assist with class administration tasks.

## Features

- **📚 Schedule Management** (`.jadwal`) - View class schedules
- **🧹 Cleaning Duty** (`.piket`) - Check cleaning duty assignments  
- **💰 Class Fund System** (`.kas`) - Monitor class fund payments
- **📝 Homework Management** (`.pr`) - Add and view homework assignments
- **🔔 Daily Announcements** - Automated daily reminders at 6 PM WIB
- **🔐 Role-Based Access Control** - Secure command permissions

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
OWNER_NUMBER=628123456789@s.whatsapp.net
```

### 3. Database Setup

Create the following tables in your Supabase database:

#### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  jid TEXT UNIQUE,
  lid TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Member',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### jadwal_kelas
```sql
CREATE TABLE jadwal_kelas (
  id SERIAL PRIMARY KEY,
  hari TEXT NOT NULL,
  waktu TEXT NOT NULL,
  mata_pelajaran TEXT NOT NULL,
  guru TEXT NOT NULL,
  ruang TEXT NOT NULL
);
```

#### piket
```sql
CREATE TABLE piket (
  id SERIAL PRIMARY KEY,
  hari TEXT NOT NULL,
  nama_siswa TEXT[] NOT NULL
);
```

#### kas_siswa
```sql
CREATE TABLE kas_siswa (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL,
  sudah_bayar INTEGER DEFAULT 0,
  tanggal_terakhir_bayar DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### kas_history
```sql
CREATE TABLE kas_history (
  id SERIAL PRIMARY KEY,
  nama_siswa TEXT NOT NULL,
  jumlah INTEGER NOT NULL,
  tanggal DATE NOT NULL,
  minggu_ke INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### homework
```sql
CREATE TABLE homework (
  id SERIAL PRIMARY KEY,
  mata_pelajaran TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  deadline DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### settings
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert announcement group ID
INSERT INTO settings (key, value) VALUES ('announcementGroupId', 'your_group_id@g.us');
```

### 4. Build and Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Commands

### Public Commands
- `.jadwal [besok|hari]` - View class schedule
- `.piket [besok|hari]` - View cleaning duty
- `.kas [lunas|belum|nama_siswa]` - Check class fund status
- `.pr` - View active homework

### Admin Commands (Owner, Admin, Sekretaris)
- `.pr add <subject> | <description> | <deadline>` - Add homework

## Bot Behavior

- **Timezone**: All operations use Asia/Jakarta (WIB)
- **Daily Announcements**: Sent automatically at 18:00 WIB
- **Message Style**: Simple and professional responses
- **Permissions**: Role-based access control for sensitive commands

## Architecture

```
src/
├── commands/          # Command implementations
├── handlers/          # Message and command handlers  
├── schedulers/        # Automated tasks
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── index.ts          # Main entry point
```

## Contributing

1. Follow the existing code structure
2. Add proper TypeScript types
3. Keep responses concise and professional
4. Test commands thoroughly before deployment

## License

MIT License - See LICENSE file for details