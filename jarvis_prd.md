## **Product Requirements Document: Jarvis Bot (Phase 1 - MVP)**

### **1. Introduction**

  * **Project Name:** Jarvis Bot
  * **Objective:** To develop a functional, multi-purpose WhatsApp assistant for the "X TKJ C" class. The Minimum Viable Product (MVP) will focus on automating core administrative tasks, providing quick access to essential class information, and establishing a robust technical foundation for future development.

### **2. Target Audience**

  * **Students:** All 34 members of the X TKJ C class.
  * **Class Officers:** Designated roles (Chairman, Treasurer, Secretary) with elevated permissions for specific commands.
  * **Owner:** The primary administrator (Zhafran) with full system control.

### **3. Technical Architecture**

  * **Language:** TypeScript
  * **Platform:** Node.js
  * **WhatsApp Library:** `@whiskeysockets/baileys`
  * **Database:** Supabase (PostgreSQL) as the single source of truth.
  * **Automation/Sync:** Google Apps Script to sync data from a Google Form to the Supabase database for the class fund system.
  * **AI Programmer:** Kiro (powered by a Claude Sonnet 4 class model).

### **4. Non-Functional Requirements**

  * **Bot Persona:** All bot responses must be **Simple and Professional**. They should be concise, avoid unnecessary multi-line messages, and use emojis primarily as informational indicators (e.g., ✅, ❌, 📚).
  * **Timezone:** All time-based operations (schedulers, timestamps, day lookups) must be standardized to **`Asia/Jakarta` (WIB)**.
  * **Security:** Administrative commands must be protected by a Role-Based Access Control (RBAC) system.

### **5. Feature Specifications (Phase 1 - MVP)**

#### **5.1. Core System: Modular Command Handler**

  * **Logic:** The system must dynamically load all command files from a `/src/commands` directory. It must parse messages starting with a `.` prefix and execute the corresponding command.

#### **5.2. Feature: Class Schedule (`.jadwal`)**

  * **Command:** `.jadwal`
  * **Aliases:** `.schedule`, `.kelas`
  * **Access:** All users.
  * **Logic:**
    1.  The command can be run with or without arguments.
    2.  If no argument is provided, it fetches today's schedule.
    3.  If the argument is `besok`, it fetches tomorrow's schedule.
    4.  If the argument is a day name (e.g., `senin`), it fetches the schedule for that day. Day name matching should be case-insensitive.
    5.  It queries the `jadwal_kelas` table in Supabase.
    6.  If no schedule is found, it replies with a "no schedule" message.
  * **Example Output:**
    ```
    📚 Jadwal Pelajaran Hari Ini (KAMIS):

    ⏰ Waktu: SIANG
    📖 Mata Pelajaran: MTK & B. INGGRIS
    👨‍🏫 Guru: Veny Septiany, S.Pd & Sinda Muliani, S.Pd.Ing., M.Sas
    🚪 Ruang: R. 13
    ```

#### **5.3. Feature: Cleaning Duty (`.piket`)**

  * **Command:** `.piket`
  * **Aliases:** `.cleaningduty`
  * **Access:** All users.
  * **Logic:**
    1.  Follows the same argument logic as `.jadwal` (no argument for today, `besok` for tomorrow, `[day name]` for a specific day).
    2.  It queries the `piket` table in Supabase. The `nama_siswa` column is a text array (`TEXT[]`).
    3.  It formats the names from the array into a numbered list.
  * **Example Output:**
    ```
    🧹 Jadwal Piket Hari Ini (KAMIS):

    1. Anggun Syakila Insani
    2. Annisa Nur Fitriana
    3. Muhammad Ari S
    ...
    ```

#### **5.4. Feature: Class Fund System (`.kas`)**

  * **Command:** `.kas`
  * **Aliases:** `.keuangan`
  * **Access:** All users (full transparency).
  * **Backend Logic:**
    1.  Data is input by the Treasurer via a dedicated Google Form.
    2.  A Google Apps Script, triggered `On form submit`, sends the data to Supabase.
    3.  The script updates the `kas_siswa` table (incrementing `sudah_bayar` and setting `tanggal_terakhir_bayar`) and inserts a record into `kas_history`.
  * **Bot Logic:**
    1.  `.kas` (no argument): Displays a summary for the current week, including total balance, number of students paid this week, and number of students not paid this week.
    2.  `.kas lunas`: Lists the names of students who have paid this week.
    3.  `.kas belum`: Lists the names of students who have not paid this week.
    4.  `.kas [student name]`: Displays a detailed status for the specified student, including their weekly status and overall balance.

#### **5.5. Feature: Homework System (`.pr`)**

  * **Command:** `.pr`
  * **Aliases:** `.homework`, `.tugas`
  * **Access:**
      * `.pr add ...`: Restricted to roles `Owner`, `Admin`, `Sekretaris 1`, `Sekretaris 2`.
      * `.pr`: Accessible by all users.
  * **Logic:**
    1.  The `.pr add <subject> | <description> | <deadline>` command inserts a new assignment into the `homework` table.
    2.  The `.pr` command fetches all assignments from the `homework` table whose deadline has not yet passed and displays them, sorted by the nearest deadline.

#### **5.6. Core System: Role-Based Access Control (RBAC)**

  * **Logic:** Before executing a restricted command, the `commandHandler` must query the `users` table. It will use the sender's ID (`JID` from DM or `LID` from groups) to find their record and verify if their `role` is in the list of allowed roles for that command.

#### **5.7. Feature: Daily Announcement Scheduler**

  * **Trigger:** An automatic `node-cron` scheduler running every day at **18:00 WIB**.
  * **Logic:**
    1.  The scheduler fetches the `announcementGroupId` from the `settings` table.
    2.  It then fetches all necessary data for *tomorrow*: the schedule from `jadwal_kelas`, the cleaning duty list from `piket`, the list of students who haven't paid kas *this week* from `kas_siswa`, and homework due tomorrow from `homework`.
    3.  It formats all this information into a single, professional message.
    4.  It sends the message to the designated announcement group.