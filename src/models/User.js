const bcrypt   = require('bcryptjs');
const db       = require('../config/database');

const User = {
  // Listar com filtro opcional por role
  findAll({ role } = {}) {
    let sql = 'SELECT id, name, email, role, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    sql += ' ORDER BY name ASC';
    return db.query(sql, params);
  },

  // Buscar por ID (sem senha)
  findById(id) {
    return db.get(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [id]
    );
  },

  // Buscar por ID (com senha — para autenticação)
  findByIdWithPassword(id) {
    return db.get('SELECT * FROM users WHERE id = ?', [id]);
  },

  // Buscar por email (com senha — para login)
  findByEmail(email) {
    return db.get('SELECT * FROM users WHERE email = ?', [email]);
  },

  // Verificar se email já está em uso (excluindo um ID)
  isEmailTaken(email, excludeId = null) {
    return db.get(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, excludeId ?? -1]
    );
  },

  // Criar
  async create({ name, email, password, role = 'member' }) {
    const hash   = await bcrypt.hash(password, 10);
    const result = db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, role]
    );
    return User.findById(result.lastInsertRowid);
  },

  // Atualizar
  async update(id, fields) {
    const user = db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return null;

    const newName  = fields.name  || user.name;
    const newEmail = fields.email || user.email;
    const newPass  = fields.password
      ? await bcrypt.hash(fields.password, 10)
      : user.password;

    db.run(
      'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
      [newName, newEmail, newPass, id]
    );

    return User.findById(id);
  },

  // Deletar
  delete(id) {
    db.run('DELETE FROM users WHERE id = ?', [id]);
  },

  // Verificar se tem empréstimos ativos
  hasActiveLoans(id) {
    return db.get(
      "SELECT id FROM loans WHERE member_id = ? AND status IN ('active','overdue')",
      [id]
    );
  },

  // Histórico de empréstimos do usuário
  getLoans(id) {
    return db.query(`
      SELECT l.*,
             b.title  AS book_title,
             b.author AS book_author,
             lib.name AS librarian_name
      FROM loans l
      JOIN books b   ON b.id   = l.book_id
      JOIN users lib ON lib.id = l.librarian_id
      WHERE l.member_id = ?
      ORDER BY l.loaned_at DESC
    `, [id]);
  },
};

module.exports = User;
