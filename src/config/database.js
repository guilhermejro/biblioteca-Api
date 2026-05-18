const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.resolve(process.env.DB_PATH || './database.sqlite');

let db; // instância global

// ── Persiste o banco em disco ─────────────────────────────────────────────────
function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ── Helper: executa SELECT e retorna array de objetos ─────────────────────────
function query(sql, params = []) {
  const stmt   = db.prepare(sql);
  const rows   = [];
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ── Helper: executa INSERT / UPDATE / DELETE ──────────────────────────────────
function run(sql, params = []) {
  const stmt = db.prepare(sql);

  stmt.run(params);

  const result = {
    lastInsertRowid: db.exec(
      'SELECT last_insert_rowid() AS id'
    )[0].values[0][0]
  };

  stmt.free();

  saveDb();

  return result;
}
// ── Helper: retorna um único registro ─────────────────────────────────────────
function get(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

// ── Cria as tabelas se não existirem ─────────────────────────────────────────
function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      role       TEXT    NOT NULL DEFAULT 'member',   -- 'librarian' | 'member'
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT    NOT NULL,
      author        TEXT    NOT NULL,
      isbn          TEXT    UNIQUE,
      publisher     TEXT,
      year          INTEGER,
      total_copies  INTEGER NOT NULL DEFAULT 1,
      available     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS loans (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id       INTEGER NOT NULL REFERENCES books(id),
      member_id     INTEGER NOT NULL REFERENCES users(id),
      librarian_id  INTEGER NOT NULL REFERENCES users(id),
      loaned_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      due_date      TEXT    NOT NULL,
      returned_at   TEXT,
      status        TEXT    NOT NULL DEFAULT 'active'   -- 'active' | 'returned' | 'overdue'
    )
  `);

  saveDb();
}

// ── Inicializa o banco (carrega do disco ou cria novo) ────────────────────────
async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  console.log(`✅  Banco de dados pronto: ${DB_PATH}`);
}

module.exports = { initDb, query, run, get, saveDb };
