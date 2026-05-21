const db = require('../config/database');

const Book = {
  // Listar com filtros opcionais e paginação síncrona
 findAll({ page = 1, limit = 50, search = '' } = {}) {
    // 1. Força a conversão para inteiros puros no escopo do JavaScript
    const numPage = parseInt(page, 10) || 1;
    const numLimit = parseInt(limit, 10) || 50;
    const offset = (numPage - 1) * numLimit;

    // 2. PRIMEIRA CONSULTA: Contar o total de registros
    let countSql = 'SELECT COUNT(*) as total FROM books WHERE 1=1';
    const countParams = [];

    if (search) {
      countSql += ' AND (title LIKE ? OR author LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const totalRow = db.get(countSql, countParams);
    const totalItems = totalRow ? totalRow.total : 0;
    const totalPages = Math.ceil(totalItems / numLimit);

    // 3. SEGUNDA CONSULTA: Buscar os dados limitados
    let sql = 'SELECT * FROM books WHERE 1=1';
    const selectParams = [];

    if (search) {
      sql += ' AND (title LIKE ? OR author LIKE ?)';
      selectParams.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY title ASC';

    // 🔥 AQUI ESTÁ A MUDANÇA: Injetamos os números direto na string do SQL!
    // Como numLimit e offset foram processados por parseInt(), isso é 100% seguro contra SQL Injection.
    sql += ` LIMIT ${numLimit} OFFSET ${offset}`;

    // Executa a busca passando apenas os parâmetros do 'search' (se houver)
    const books = db.query(sql, selectParams);

    // 4. Retorna a estrutura exata que o React precisa
    return {
      books: books || [],
      totalPages: totalPages || 1,
      currentPage: numPage,
      totalItems
    };
  },

  // Buscar por ID
  findById(id) {
    return db.get('SELECT * FROM books WHERE id = ?', [id]);
  },

  // Buscar por ISBN
  findByIsbn(isbn) {
    return db.get('SELECT id FROM books WHERE isbn = ?', [isbn]);
  },

  // Criar novo livro (com descrição)
  create({ title, author, isbn, publisher, year, total_copies, image_url, description }) {
    const copies = Number(total_copies) || 1;
    const result = db.run(
      `INSERT INTO books (title, author, isbn, publisher, year, total_copies, available, image_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    console.log(result);

    return db.get('SELECT * FROM books WHERE id = ?', [result.lastInsertRowid]);
  },

  // Atualizar dados do livro (com descrição e imagem)
  update(id, fields) {
    const book = Book.findById(id);
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

    db.run(
      `UPDATE books
       SET title=?, author=?, isbn=?, publisher=?, year=?, total_copies=?, available=?, description=?, image_url=?
       WHERE id=?`,
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

    return Book.findById(id);
  },

  // Deletar do acervo
  delete(id) {
    db.run('DELETE FROM books WHERE id = ?', [id]);
  },

  decrementAvailable(id) {
    db.run('UPDATE books SET available = available - 1 WHERE id = ?', [id]);
  },

  incrementAvailable(id) {
    db.run('UPDATE books SET available = available + 1 WHERE id = ?', [id]);
  },

  hasActiveLoans(id) {
    return db.get("SELECT id FROM loans WHERE book_id = ? AND status = 'active'", [id]);
  },
};

module.exports = Book;