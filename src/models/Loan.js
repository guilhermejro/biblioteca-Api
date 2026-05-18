const db = require('../config/database');

// Query base com JOINs reutilizada em todos os SELECTs
const BASE_SELECT = `
  SELECT l.*,
         b.title  AS book_title,
         b.author AS book_author,
         u.name   AS member_name,
         u.email  AS member_email,
         lib.name AS librarian_name
  FROM loans l
  JOIN books b   ON b.id   = l.book_id
  JOIN users u   ON u.id   = l.member_id
  LEFT JOIN users lib ON lib.id = l.librarian_id
`;

// Marca empréstimos vencidos automaticamente
function updateOverdue() {
  const today = new Date().toISOString().split('T')[0];
  db.run(
    `UPDATE loans SET status = 'overdue'
     WHERE status = 'active' AND due_date < ?`,
    [today]
  );
}

// Calcula data de devolução (padrão: 14 dias)
function calcDueDate(days = 14) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const Loan = {
  // Listar com filtros
findAll({ role, userId, status, member_id, book_id, page, limit } = {}) {
    updateOverdue();

    const params = [];
    let where = 'WHERE 1=1';

    if (role === 'member') {
      where += ' AND l.member_id = ?';
      params.push(userId);
    } else if (member_id) {
      where += ' AND l.member_id = ?';
      params.push(member_id);
    }

    if (book_id) {
      where += ' AND l.book_id = ?';
      params.push(book_id);
    }

    if (status) {
      where += ' AND l.status = ?';
      params.push(status);
    }

    let query = `${BASE_SELECT} ${where} ORDER BY l.loaned_at DESC`;

    // 🔥 SOLUÇÃO DEFINITIVA PARA O SQLITE: Injetar os números direto na Query string
    if (page && limit) {
      const parsedLimit = Number(limit);
      const parsedOffset = (Number(page) - 1) * parsedLimit; 
      
      // Concatenamos diretamente os valores limpos e validados para evitar o bug do driver SQL
      query += ` LIMIT ${parsedLimit} OFFSET ${parsedOffset}`;
    }

    return db.query(query, params);
  },
  async count({ role, userId, status, member_id, book_id } = {}) {
    const params = [];
    let where = 'WHERE 1=1';

    if (role === 'member') {
      where += ' AND member_id = ?';
      params.push(userId);
    } else if (member_id) {
      where += ' AND member_id = ?';
      params.push(member_id);
    }

    if (book_id) {
      where += ' AND book_id = ?';
      params.push(book_id);
    }

    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }

    // Faz uma query rápida apenas contando os registros filtrados
    const result = await db.get(`SELECT COUNT(*) AS total FROM loans ${where}`, params);
    return result ? result.total : 0;
  },

  // Buscar por ID
  findById(id) {
    updateOverdue();
    return db.get(`${BASE_SELECT} WHERE l.id = ?`, [id]);
  },

  // Verificar se membro já tem esse livro emprestado ou reservado
  findActive(bookId, memberId) {
    return db.get(
      "SELECT id FROM loans WHERE book_id = ? AND member_id = ? AND status IN ('active','overdue','pending')",
      [bookId, memberId]
    );
  },

  // ⚠️ NOVA FUNÇÃO: Verifica se o membro tem QUALQUER livro atrasado no sistema
  findOverdueByMember(memberId) {
    updateOverdue(); // Roda o pente fino antes de checar para garantir o dado em tempo real
    return db.get(
      "SELECT id FROM loans WHERE member_id = ? AND status = 'overdue' LIMIT 1",
      [memberId]
    );
  },

  // Listar vencidos
  findOverdue() {
    updateOverdue();
    return db.query(
      `${BASE_SELECT} WHERE l.status = 'overdue' ORDER BY l.due_date ASC`,
      []
    );
  },

  // Criar empréstimo
  create({ book_id, member_id, librarian_id, due_days, status }) {
    const due_date = calcDueDate(Number(due_days ?? 14));
    const initialStatus = status || 'active';

    const result = db.run(
      `INSERT INTO loans (book_id, member_id, librarian_id, due_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [book_id, member_id, librarian_id, due_date, initialStatus]
    );
    return Loan.findById(result.lastInsertRowid);
  },

  // Atualizar status e bibliotecário
  updateStatusAndLibrarian(id, status, librarian_id) {
    db.run(
      `UPDATE loans 
       SET status = ?, librarian_id = ? 
       WHERE id = ?`,
      [status, librarian_id, id]
    );
    return this.findById(id);
  },

  // Registrar devolução
  return(id) {
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    db.run(
      "UPDATE loans SET status = 'returned', returned_at = ? WHERE id = ?",
      [now, id]
    );
    return Loan.findById(id);
  },
};

module.exports = Loan;