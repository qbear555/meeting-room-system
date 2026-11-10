'use strict';

const fs = require('fs');
const path = require('path');

let dbInstance = null;

function wrapSqlite(database) {
  const originalPrepare = database.prepare.bind(database);
  database.prepare = (sql) => {
    const stmt = originalPrepare(sql);
    const originalRun = stmt.run.bind(stmt);
    stmt.run = (...args) => {
      const result = originalRun(...args);
      if (result && typeof result === 'object') {
        return {
          changes: result.changes ?? 0,
          lastInsertRowid: Number(result.lastInsertRowid ?? 0),
        };
      }
      const row = database.prepare('SELECT last_insert_rowid() AS id, changes() AS c').get();
      return { changes: row?.c ?? 0, lastInsertRowid: Number(row?.id ?? 0) };
    };
    return stmt;
  };
  return database;
}

function initSqlite(dbFilePath) {
  const { DatabaseSync } = require('node:sqlite');
  const targetPath = dbFilePath || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'meeting_room.db');
  const dir = path.dirname(path.resolve(targetPath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const raw = new DatabaseSync(targetPath);
  const db = wrapSqlite(raw);
  db.client = 'sqlite';
  db.filename = targetPath;
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.execRaw = (sql) => db.exec(sql);
  return db;
}

function initDb() {
  if (dbInstance) return dbInstance;
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();

  if (dbType === 'sqlite') {
    dbInstance = initSqlite();
    console.log(`[db] SQLite connected: ${dbInstance.filename}`);
  } else {
    throw new Error(`Unsupported DB_TYPE: ${dbType}. Currently SQLite is supported natively via Node.js.`);
  }

  return dbInstance;
}

module.exports = {
  initDb,
  getDb: () => dbInstance || initDb(),
};
