'use strict';

const bcrypt = require('bcryptjs');

const SQLITE_DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    department TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS meeting_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 6,
    location TEXT DEFAULT '',
    facilities TEXT DEFAULT '',
    color TEXT DEFAULT '#2563eb',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS meeting_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    booking_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    start_datetime TEXT NOT NULL,
    end_datetime TEXT NOT NULL,
    attendee_count INTEGER DEFAULT 1,
    attendees TEXT DEFAULT '',
    attendee_ids TEXT DEFAULT '',
    external_attendees TEXT DEFAULT '',
    notify_email INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (room_id) REFERENCES meeting_rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_mb_room_date ON meeting_bookings(room_id, booking_date);
  CREATE INDEX IF NOT EXISTS idx_mb_user ON meeting_bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_mb_date ON meeting_bookings(booking_date);
`;

function applySchema(db) {
  db.exec(SQLITE_DDL);

  // 1. 初始化預設會議室
  const existingRooms = db.prepare('SELECT COUNT(*) AS c FROM meeting_rooms').get();
  if (!existingRooms || existingRooms.c === 0) {
    db.prepare(`
      INSERT INTO meeting_rooms (name, capacity, location, facilities, color, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('會議室', 0, '', '', '#2563eb', 1);
    console.log('[schema] Initialized default meeting room: 會議室');
  }

  // 2. 初始化測試/預設同仁帳號
  const existingUsers = db.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (!existingUsers || existingUsers.c === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('123456', salt);
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, name, email, department, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('admin', hash, '管理員', 'admin@company.com', '管理部', 'admin');
    insertUser.run('tzuming', hash, '子銘', 'tsuming@company.com', '資訊部', 'user');
    insertUser.run('colleague1', hash, '怡君', 'yijun@company.com', '業務部', 'user');
    insertUser.run('colleague2', hash, '冠宇', 'guanyu@company.com', '研發部', 'user');
    insertUser.run('colleague3', hash, '雅婷', 'yating@company.com', '財務部', 'user');

    console.log('[schema] Initialized 5 default colleague users (password: 123456)');
  }
}

module.exports = {
  applySchema,
};
