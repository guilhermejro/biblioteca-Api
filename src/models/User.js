const bcrypt   = require('bcryptjs');
const db       = require('../config/database');

const User = {
  // Listar com filtro opcional por role
  async findAll({ role } = {}) {
    let sql = 'SELECT id, name, email, role, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }

    sql += ' ORDER BY name ASC';
    return await db.query(sql, params);
  },

  // Buscar por ID (sem senha)
  async findById(id) {
    return await db.get(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
  },

  // Buscar por ID (com senha — para autenticação/alteração de credenciais)
  async findByIdWithPassword(id) {
    return await db.get('SELECT * FROM users WHERE id = $1', [id]);
  },

  // Buscar por email (com senha — para rotas de login)
  async findByEmail(email) {
    return await db.get('SELECT * FROM users WHERE email = $1', [email]);
  },

  // Verificar se email já está em uso (excluindo um ID específico)
  async isEmailTaken(email, excludeId = null) {
    return await db.get(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, excludeId ?? -1]
    );
  },

  // Criar novo usuário
  async create({ name, email, password, role = 'member' }) {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hash, role]
    );

    const insertedId = result.rows ? result.rows[0].id : result.lastInsertRowid;
    return await User.findById(insertedId);
  },

  // Atualizar dados cadastrais
  async update(id, fields) {
    const user = await User.findByIdWithPassword(id);
    if (!user) return null;

    const newName  = fields.name  || user.name;
    const newEmail = fields.email || user.email;
    const newPass  = fields.password
      ? await bcrypt.hash(fields.password, 10)
      : user.password;

    await db.run(
      'UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4',
      [newName, newEmail, newPass, id]
    );

    return await User.findById(id);
  },

  // Deletar do sistema
  async delete(id) {
    await db.run('DELETE FROM users WHERE id = $1', [id]);
  },

  // Verificar se possui empréstimos pendentes ou em atraso
  async hasActiveLoans(id) {
    return await db.get(
      "SELECT id FROM loans WHERE member_id = $1 AND status IN ('active','overdue')",
      [id]
    );
  },

  // Histórico completo de empréstimos do membro
  async getLoans(id) {
    return await db.query(`
      SELECT l.*,
             b.title  AS book_title,
             b.author AS book_author,
             lib.name AS librarian_name
      FROM loans l
      JOIN books b        ON b.id   = l.book_id
      LEFT JOIN users lib ON lib.id = l.librarian_id
      WHERE l.member_id = $1
      ORDER BY l.loaned_at DESC
    `, [id]);
  },
};

module.exports = User;