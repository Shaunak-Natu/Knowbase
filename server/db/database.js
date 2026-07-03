const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH ||
  path.join(__dirname, '../../data/knowbase.db');

let db = null;
let SQL = null;

async function initDB() {
  if (db) return db;

  SQL = await initSqlJs();

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  schedulePersist();
  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT DEFAULT '[]',
      parent_id TEXT,
      icon TEXT DEFAULT '📄',
      cover TEXT,
      is_archived INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      view_type TEXT DEFAULT 'document',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES pages(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6366f1',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS page_tags (
      page_id TEXT,
      tag_id TEXT,
      PRIMARY KEY (page_id, tag_id),
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      page_id TEXT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      path TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS page_links (
      source_id TEXT,
      target_id TEXT,
      PRIMARY KEY (source_id, target_id),
      FOREIGN KEY (source_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES pages(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS kanban_cards (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      column_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      position INTEGER DEFAULT 0,
      color TEXT DEFAULT '#6366f1',
      due_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS kanban_columns (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      color TEXT DEFAULT '#6366f1',
      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts
    USING fts5(id UNINDEXED, title, content)
  `);

  // Trigger to update FTS on insert/update
  db.run(`
    CREATE TRIGGER IF NOT EXISTS pages_fts_insert
    AFTER INSERT ON pages BEGIN
      INSERT INTO pages_fts(id, title, content) VALUES (new.id, new.title, new.content);
    END
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS pages_fts_update
    AFTER UPDATE ON pages BEGIN
      UPDATE pages_fts SET title = new.title, content = new.content WHERE id = new.id;
    END
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS pages_fts_delete
    AFTER DELETE ON pages BEGIN
      DELETE FROM pages_fts WHERE id = old.id;
    END
  `);
}

// Persist DB to disk every 30 seconds and on changes
let persistTimer = null;
function schedulePersist() {
  if (persistTimer) clearInterval(persistTimer);
  persistTimer = setInterval(() => persistDB(), 30000);
}

function persistDB() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('DB persist error:', err);
  }
}

function getDB() {
  return db;
}

// Helper: run query and return all rows as objects
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Helper: run a single get
function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

// Helper: run insert/update/delete
function run(sql, params = []) {
  db.run(sql, params);
  persistDB();
}

process.on('exit', persistDB);
process.on('SIGINT', () => { persistDB(); process.exit(); });
process.on('SIGTERM', () => { persistDB(); process.exit(); });

module.exports = { initDB, getDB, query, queryOne, run, persistDB };
