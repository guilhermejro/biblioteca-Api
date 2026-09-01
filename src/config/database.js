const { Pool } = require('pg');

// Configuração do pool de conexões (lê do .env ou usa string/dados padrão)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Caso não use DATABASE_URL, você pode configurar individualmente:
  // host: process.env.DB_HOST || 'localhost',
  // port: process.env.DB_PORT || 5432,
  // user: process.env.DB_USER || 'postgres',
  // password: process.env.DB_PASSWORD || 'postgres',
  // database: process.env.DB_NAME || 'library_db',
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ── Helper: executa SELECT e retorna array de objetos ─────────────────────────
async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// ── Helper: executa INSERT / UPDATE / DELETE ──────────────────────────────────
async function run(sql, params = []) {
  // Para retornar o ID inserido no Postgres, certifique-se de adicionar 'RETURNING id' no final do INSERT
  const result = await pool.query(sql, params);

  return {
    rowCount: result.rowCount,
    lastInsertRowid: result.rows[0]?.id || null
  };
}

// ── Helper: retorna um único registro ─────────────────────────────────────────
async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// ── Cria as tabelas se não existirem ─────────────────────────────────────────
async function createTables() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      email      VARCHAR(255) NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      role       VARCHAR(50)  NOT NULL DEFAULT 'member',   -- 'librarian' | 'member'
      created_at TIMESTAMP    NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS books (
      id            SERIAL PRIMARY KEY,
      title         VARCHAR(255) NOT NULL,
      author        VARCHAR(255) NOT NULL,
      isbn          VARCHAR(100) UNIQUE,
      publisher     VARCHAR(255),
      year          INTEGER,
      description   TEXT, 
      image_url     TEXT,
      total_copies  INTEGER      NOT NULL DEFAULT 1,
      available     INTEGER      NOT NULL DEFAULT 1,
      created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS loans (
      id            SERIAL PRIMARY KEY,
      book_id       INTEGER      NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      member_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      librarian_id  INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      loaned_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
      due_date      TIMESTAMP    NOT NULL,
      returned_at   TIMESTAMP,
      status        VARCHAR(50)  NOT NULL DEFAULT 'active'   -- 'active' | 'returned' | 'overdue'
    );
  `;

  try {
    await pool.query(queryText);
    console.log('✅ Tabelas verificadas/criadas no PostgreSQL.');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas no PostgreSQL:', error);
  }
}

// ── Inicializa a conexão e cria as tabelas ────────────────────────────────────
async function initDb() {
  try {
    await pool.query('SELECT NOW()'); // Testa a conexão com o banco
    await createTables();
    console.log('✅ Conexão com o PostgreSQL estabelecida com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao conectar ao PostgreSQL:', error);
    process.exit(1);
  }
}

// Mantido por compatibilidade (não é necessário no Postgres)
function saveDb() {
  // As alterações no Postgres são salvas instantaneamente em disco
}

module.exports = { initDb, query, run, get, saveDb, pool };