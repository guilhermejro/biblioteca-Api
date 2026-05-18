const db = require('../config/database');

const Book = {
  // Listar com filtros opcionais (continua igual)
  findAll({ title, author, available } = {}) {
    let sql = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (title) {
      sql += ' AND title LIKE ?';
      params.push(`%${title}%`);
    }
    if (author) {
      sql += ' AND author LIKE ?';
      params.push(`%${author}%`);
    }
    if (available === 'true') {
      sql += ' AND available > 0';
    }

    sql += ' ORDER BY title ASC';
    return db.query(sql, params);
  },

  // Buscar por ID (continua igual)
  findById(id) {
    return db.get('SELECT * FROM books WHERE id = ?', [id]);
  },

  // Buscar por ISBN (continua igual)
  findByIsbn(isbn) {
    return db.get('SELECT id FROM books WHERE isbn = ?', [isbn]);
  },

  // 1. Criar (ADICIONADO DESCRIPTION)
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
        description || null // <- Novo campo aqui
      ]
    );

    console.log(result);

    return db.get('SELECT * FROM books WHERE id = ?', [result.lastInsertRowid]);
  },

  // 2. Atualizar (ADICIONADO DESCRIPTION)
  update(id, fields) {
    const book = Book.findById(id);
    if (!book) return null;

    const newTitle = fields.title ?? book.title;
    const newAuthor = fields.author ?? book.author;
    const newIsbn = fields.isbn ?? book.isbn;
    const newPublisher = fields.publisher ?? book.publisher;
    const newYear = fields.year ?? book.year;
    const newDescription = fields.description ?? book.description;
    // 🔥 CORREÇÃO: Pega a nova URL da imagem enviada pelo React, ou mantém a antiga se não enviou nada
    const newImageUrl = fields.image_url ?? book.image_url;

    const newTotal = fields.total_copies != null ? Number(fields.total_copies) : book.total_copies;
    const diff = newTotal - book.total_copies;
    const newAvail = Math.max(0, book.available + diff);

    // 🔥 CORREÇÃO: Adicionado "image_url=?" na string SQL do UPDATE
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
        newImageUrl, // 🔥 CORREÇÃO: Passado o parâmetro correspondente ao image_url
        id
      ]
    );

    return Book.findById(id);
  },

  // Deletar e outros métodos (continuam iguais)...
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