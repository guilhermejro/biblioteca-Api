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
async function updateOverdue() {
  const today = new Date().toISOString().split('T')[0];
  await db.run(
    `UPDATE loans SET status = 'overdue'
     WHERE status = 'active' AND due_date < $1`,
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
  // Listar com filtros e paginação
  async findAll({ role, userId, status, member_id, book_id, page, limit } = {}) {
    await updateOverdue();

    const params = [];
    let where = 'WHERE 1=1';

    if (role === 'member') {
      params.push(userId);
      where += ` AND l.member_id = $${params.length}`;
    } else if (member_id) {
      params.push(member_id);
      where += ` AND l.member_id = $${params.length}`;
    }

    if (book_id) {
      params.push(book_id);
      where += ` AND l.book_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      where += ` AND l.status = $${params.length}`;
    }

    let query = `${BASE_SELECT} ${where} ORDER BY l.loaned_at DESC`;

    if (page && limit) {
      const parsedLimit = Number(limit);
      const parsedOffset = (Number(page) - 1) * parsedLimit;

      params.push(parsedLimit);
      query += ` LIMIT $${params.length}`;

      params.push(parsedOffset);
      query += ` OFFSET $${params.length}`;
    }

    return await db.query(query, params);
  },

  // Contador totalizador para controle de paginação
  async count({ role, userId, status, member_id, book_id } = {}) {
    const params = [];
    let where = 'WHERE 1=1';

    if (role === 'member') {
      params.push(userId);
      where += ` AND member_id = $${params.length}`;
    } else if (member_id) {
      params.push(member_id);
      where += ` AND member_id = $${params.length}`;
    }

    if (book_id) {
      params.push(book_id);
      where += ` AND book_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }

    const result = await db.get(`SELECT COUNT(*) AS total FROM loans ${where}`, params);
    return result ? parseInt(result.total, 10) : 0;
  },

  // Buscar por ID
  async findById(id) {
    await updateOverdue();
    return await db.get(`${BASE_SELECT} WHERE l.id = $1`, [id]);
  },

  // Verificar se membro já tem esse livro emprestado ou reservado
  async findActive(bookId, memberId) {
    return await db.get(
      "SELECT id FROM loans WHERE book_id = $1 AND member_id = $2 AND status IN ('active','overdue','pending')",
      [bookId, memberId]
    );
  },

  // Verifica se o membro tem livros atrasados
  async findOverdueByMember(memberId) {
    await updateOverdue();
    return await db.get(
      "SELECT id FROM loans WHERE member_id = $1 AND status = 'overdue' LIMIT 1",
      [memberId]
    );
  },

  // Listar vencidos
  async findOverdue() {
    await updateOverdue();
    return await db.query(
      `${BASE_SELECT} WHERE l.status = 'overdue' ORDER BY l.due_date ASC`,
      []
    );
  },

  // Criar empréstimo
  async create({ book_id, member_id, librarian_id, due_days, status }) {
    const due_date = calcDueDate(Number(due_days ?? 14));
    const initialStatus = status || 'active';

    const result = await db.run(
      `INSERT INTO loans (book_id, member_id, librarian_id, due_date, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [book_id, member_id, librarian_id, due_date, initialStatus]
    );

    const insertedId = result.rows ? result.rows[0].id : result.lastInsertRowid;
    return await Loan.findById(insertedId);
  },

  // Atualizar status e bibliotecário
  async updateStatusAndLibrarian(id, status, librarian_id) {
    await db.run(
      `UPDATE loans 
       SET status = $1, librarian_id = $2 
       WHERE id = $3`,
      [status, librarian_id, id]
    );
    return await this.findById(id);
  },

  // Registrar devolução
  async return(id) {
    const now = new Date().toISOString();
    await db.run(
      "UPDATE loans SET status = 'returned', returned_at = $1 WHERE id = $2",
      [now, id]
    );
    return await Loan.findById(id);
  },
};

module.exports = Loan;