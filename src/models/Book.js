const db = require('../config/database');

const Book = {
  // Listar com filtros opcionais e paginação assíncrona
  async findAll({ page = 1, limit = 50, search = '' } = {}) {
    const numPage = parseInt(page, 10) || 1;
    const numLimit = parseInt(limit, 10) || 50;
    const offset = (numPage - 1) * numLimit;

    // 1. PRIMEIRA CONSULTA: Contar o total de registros
    let countSql = 'SELECT COUNT(*) as total FROM books WHERE 1=1';
    const countParams = [];

    if (search) {
      countSql += ' AND (title ILIKE $1 OR author ILIKE $2)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const totalRow = await db.get(countSql, countParams);
    const totalItems = totalRow ? parseInt(totalRow.total, 10) : 0;
    const totalPages = Math.ceil(totalItems / numLimit) || 1;

    // 2. SEGUNDA CONSULTA: Buscar os dados limitados
    let sql = 'SELECT * FROM books WHERE 1=1';
    const selectParams = [];

    if (search) {
      sql += ' AND (title ILIKE $1 OR author ILIKE $2)';
      selectParams.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY title ASC';

    // No Postgres, podemos passar LIMIT e OFFSET via parâmetros sanitizados ($1, $2)
    const limitIndex = selectParams.length + 1;
    const offsetIndex = selectParams.length + 2;
    sql += ` LIMIT $${limitIndex} OFFSET $${offsetIndex}`;
    selectParams.push(numLimit, offset);

    const books = await db.query(sql, selectParams);

    // 3. Retorna a estrutura para a paginação do React
    return {
      books: books || [],
      totalPages,
      currentPage: numPage,
      totalItems
    };
  },

  // Buscar por ID
  async findById(id) {
    return await db.get('SELECT * FROM books WHERE id = $1', [id]);
  },

  // Buscar por ISBN
  async findByIsbn(isbn) {
    return await db.get('SELECT id FROM books WHERE isbn = $1', [isbn]);
  },

  // Criar novo livro (retorna o registro direto via RETURNING *)
  async create({ title, author, isbn, publisher, year, total_copies, image_url, description }) {
    const copies = Number(total_copies) || 1;
    const result = await db.run(
      `INSERT INTO books (title, author, isbn, publisher, year, total_copies, available, image_url, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        title,
        author,
        isbn || null,
        publisher || null,
        year || null,
        copies,
        copies,
        image_url || null,
        description || null
      ]
    );

    // Caso a camada db.run devolva as linhas diretamente
    return result.rows ? result.rows[0] : await Book.findById(result.lastInsertRowid);
  },

  // Atualizar dados do livro
  async update(id, fields) {
    const book = await Book.findById(id);
    if (!book) return null;

    const newTitle = fields.title ?? book.title;
    const newAuthor = fields.author ?? book.author;
    const newIsbn = fields.isbn ?? book.isbn;
    const newPublisher = fields.publisher ?? book.publisher;
    const newYear = fields.year ?? book.year;
    const newDescription = fields.description ?? book.description;
    const newImageUrl = fields.image_url ?? book.image_url;

    const newTotal = fields.total_copies != null ? Number(fields.total_copies) : book.total_copies;
    const diff = newTotal - book.total_copies;
    const newAvail = Math.max(0, book.available + diff);

    await db.run(
      `UPDATE books
       SET title=$1, author=$2, isbn=$3, publisher=$4, year=$5, total_copies=$6, available=$7, description=$8, image_url=$9
       WHERE id=$10`,
      [
        newTitle,
        newAuthor,
        newIsbn,
        newPublisher,
        newYear,
        newTotal,
        newAvail,
        newDescription,
        newImageUrl,
        id
      ]
    );

    return await Book.findById(id);
  },

  // Deletar do acervo
  async delete(id) {
    await db.run('DELETE FROM books WHERE id = $1', [id]);
  },

  async decrementAvailable(id) {
    await db.run('UPDATE books SET available = available - 1 WHERE id = $1', [id]);
  },

  async incrementAvailable(id) {
    await db.run('UPDATE books SET available = available + 1 WHERE id = $1', [id]);
  },

  async hasActiveLoans(id) {
    return await db.get("SELECT id FROM loans WHERE book_id = $1 AND status = 'active'", [id]);
  },
};

module.exports = Book;