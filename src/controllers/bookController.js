const Book = require('../models/Book');

// ── GET /books ────────────────────────────────────────────────────────────────
async function listBooks(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';

    const result = await Book.findAll({ page, limit, search });

    console.log(`[PAGINAÇÃO] Solicitada página: ${page} | Limite: ${limit} | Total de Livros no Banco: ${result.totalItems} | Páginas Totais calculadas: ${result.totalPages} | Livros retornados nesta página: ${result.books.length}`);

    return res.json(result);
  } catch (error) {
    console.error("Erro no controller ao listar livros:", error);
    return res.status(500).json({ error: 'Erro interno ao listar os livros.' });
  }
}

// ── GET /books/:id ────────────────────────────────────────────────────────────
async function getBook(req, res) {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });
    return res.json(book);
  } catch (error) {
    console.error("Erro no controller ao buscar livro:", error);
    return res.status(500).json({ error: 'Erro interno ao buscar o livro.' });
  }
}

// ── POST /books  (somente bibliotecário) ─────────────────────────────────────
async function createBook(req, res) {
  try {
    const { title, author, isbn, image_url } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'Título e autor são obrigatórios.' });
    }

    if (isbn && (await Book.findByIsbn(isbn))) {
      return res.status(409).json({ error: 'ISBN já cadastrado.' });
    }
    
    if (image_url && !image_url.startsWith('http')) {
      return res.status(400).json({ error: 'O link da imagem deve ser uma URL válida.' });
    }

    const book = await Book.create(req.body);
    return res.status(201).json({ message: 'Livro cadastrado com sucesso.', book });
  } catch (error) {
    console.error("Erro no controller ao criar livro:", error);
    return res.status(500).json({ error: 'Erro interno ao cadastrar o livro.' });
  }
}

// ── PUT /books/:id  (somente bibliotecário) ───────────────────────────────────
async function updateBook(req, res) {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });

    const { title, author, isbn, image_url, description, total_copies, available } = req.body;

    if (image_url && image_url.trim() !== '' && !image_url.startsWith('http')) {
      return res.status(400).json({ error: 'O link da imagem deve ser uma URL válida.' });
    }

    const updateData = {
      title: title || book.title,
      author: author || book.author,
      isbn: isbn !== undefined ? isbn : book.isbn,
      image_url: image_url === '' ? null : (image_url || book.image_url), 
      description: description !== undefined ? description : book.description,
      total_copies: total_copies !== undefined ? Number(total_copies) : book.total_copies,
      available: available !== undefined ? Number(available) : book.available
    };

    const updated = await Book.update(req.params.id, updateData);
    
    return res.json({ message: 'Livro atualizado com sucesso.', book: updated });
  } catch (error) {
    console.error("Erro no controller ao atualizar livro:", error);
    return res.status(500).json({ error: 'Erro interno ao atualizar o livro.' });
  }
}

// ── DELETE /books/:id  (somente bibliotecário) ────────────────────────────────
async function deleteBook(req, res) {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });

    const hasLoans = await Book.hasActiveLoans(req.params.id);
    if (hasLoans) {
      return res.status(409).json({ error: 'Livro possui empréstimos ativos. Aguarde a devolução.' });
    }

    await Book.delete(req.params.id);
    return res.json({ message: 'Livro removido do acervo.' });
  } catch (error) {
    console.error("Erro no controller ao deletar livro:", error);
    return res.status(500).json({ error: 'Erro interno ao remover o livro.' });
  }
}

module.exports = { listBooks, getBook, createBook, updateBook, deleteBook };