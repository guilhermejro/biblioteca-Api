const Book = require('../models/Book');

// ── GET /books ────────────────────────────────────────────────────────────────
function listBooks(req, res) {
  const books = Book.findAll(req.query);
  return res.json(books);
}

// ── GET /books/:id ────────────────────────────────────────────────────────────
function getBook(req, res) {
  const book = Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });
  return res.json(book);
}

// ── POST /books  (somente bibliotecário) ─────────────────────────────────────
function createBook(req, res) {
  const { title, author, isbn, image_url, description } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: 'Título e autor são obrigatórios.' });
  }

  if (isbn && Book.findByIsbn(isbn)) {
    return res.status(409).json({ error: 'ISBN já cadastrado.' });
  }
  if (image_url && !image_url.startsWith('http')) {
  return res.status(400).json({ error: 'O link da imagem deve ser uma URL válida.' });
}

  const book = Book.create(req.body);
  return res.status(201).json({ message: 'Livro cadastrado com sucesso.', book });
}

// ── PUT /books/:id  (somente bibliotecário) ───────────────────────────────────
function updateBook(req, res) {
  const book = Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });

  // 1. Desestrutura os campos do corpo da requisição para garantir que o image_url passe
  const { title, author, isbn, image_url, description, total_copies, available } = req.body;

  // 2. Validação básica (igual à do cadastro) para evitar links quebrados se o usuário digitar algo errado
  if (image_url && image_url.trim() !== '' && !image_url.startsWith('http')) {
    return res.status(400).json({ error: 'O link da imagem deve ser uma URL válida.' });
  }

  // 3. Monta o objeto de atualização sanitizado
  const updateData = {
    title,
    author,
    isbn,
    image_url: image_url || null, // Se vier vazio do front, salva como null no banco
    description,
    total_copies: Number(total_copies),
    available: Number(available)
  };

  // 4. Envia o objeto tratado para o banco de dados
  const updated = Book.update(req.params.id, updateData);
  
  return res.json({ message: 'Livro atualizado com sucesso.', book: updated });
}

// ── DELETE /books/:id  (somente bibliotecário) ────────────────────────────────
function deleteBook(req, res) {
  const book = Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });

  if (Book.hasActiveLoans(req.params.id)) {
    return res.status(409).json({ error: 'Livro possui empréstimos ativos. Aguarde a devolução.' });
  }

  Book.delete(req.params.id);
  return res.json({ message: 'Livro removido do acervo.' });
}

module.exports = { listBooks, getBook, createBook, updateBook, deleteBook };
