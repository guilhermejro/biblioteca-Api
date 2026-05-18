const Loan = require('../models/Loan');
const Book = require('../models/Book');
const User = require('../models/User');

// ── POST /loans ─────────────────────────────────────────────────────────────
async function createLoan(req, res) {
  try {
    const isLibrarian = req.user.role === 'librarian';
    const member_id = isLibrarian ? req.body.member_id : req.user.id;
    const { book_id, days: due_days } = req.body;

    if (!book_id || !member_id) {
      return res.status(400).json({ error: 'book_id é obrigatório.' });
    }

    const book = await Book.findById(book_id);
    if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });

    if (isLibrarian && book.available <= 0) {
      return res.status(409).json({ error: 'Nenhum exemplar disponível para empréstimo.' });
    }

    const member = await User.findById(member_id);
    if (!member || member.role !== 'member') {
      return res.status(404).json({ error: 'Membro não encontrado.' });
    }

    if (Loan.findOverdueByMember && await Loan.findOverdueByMember(member_id)) {
      return res.status(400).json({
        error: 'Empréstimo/Reserva negado. Este leitor possui pendências de livros atrasados no sistema.'
      });
    }

    if (await Loan.findActive(book_id, member_id)) {
      return res.status(409).json({ error: 'Este membro já está com um exemplar ativo/reservado deste livro.' });
    }

    const initialStatus = isLibrarian ? 'active' : 'pending';
    const librarian_id = isLibrarian ? req.user.id : member_id;

    const loan = await Loan.create({
      book_id,
      member_id,
      librarian_id,
      due_days,
      status: initialStatus
    });

    if (initialStatus === 'active') {
      await Book.decrementAvailable(book_id);
    }

    const msg = isLibrarian
      ? 'Empréstimo registrado com sucesso.'
      : 'Solicitação de reserva enviada com sucesso! Aguarde aprovação.';

    return res.status(201).json({ message: msg, loan });
  } catch (error) {
    console.error("Erro ao criar empréstimo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}

// ── PATCH /loans/:id/approve (somente bibliotecário) ──────────────────
async function approveLoan(req, res) {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Pedido de empréstimo não encontrado.' });

    if (loan.status !== 'pending') {
      return res.status(400).json({ error: 'Este empréstimo já foi processado ou está ativo.' });
    }

    const book = await Book.findById(loan.book_id);
    if (book.available <= 0) {
      return res.status(409).json({ error: 'Não há estoque disponível para aprovar esta reserva no momento.' });
    }

    const updated = await Loan.updateStatusAndLibrarian(req.params.id, 'active', req.user.id);
    await Book.decrementAvailable(loan.book_id);

    return res.json({ message: 'Reserva aprovada com sucesso!', loan: updated });
  } catch (error) {
    console.error("Erro ao aprovar empréstimo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}

// ── PATCH /loans/:id/return  (somente bibliotecário) ─────────────────────────
async function returnLoan(req, res) {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Empréstimo não encontrado.' });

    if (loan.status === 'returned') {
      return res.status(409).json({ error: 'Este livro já foi devolvido anteriormente.' });
    }

    const today = new Date();
    const dueDateStr = loan.return_date || loan.due_date || loan.dueDate;

    let daysOverdue = 0;
    let message = 'Devolução registrada com sucesso.';

    if (dueDateStr) {
      const dueDate = new Date(dueDateStr);
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      if (today > dueDate) {
        const differenceInTime = today.getTime() - dueDate.getTime();
        daysOverdue = Math.ceil(differenceInTime / (1000 * 3600 * 24));
        message = `Devolução registrada com sucesso! Livro entregue com ${daysOverdue} dias de atraso.`;
      }
    }

    const updated = await Loan.return(req.params.id, {
      return_date: today.toISOString(),
      days_overdue: daysOverdue
    });

    await Book.incrementAvailable(loan.book_id);

    return res.json({
      message,
      loan: updated,
      daysOverdue
    });
  } catch (error) {
    console.error("Erro ao retornar empréstimo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}

// ── GET /loans ────────────────────────────────────────────────────────────────
async function listLoans(req, res) {
  try {
    // 1. Força o limite padrão para 5 itens para alinhar com a paginação do Front
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    // 2. O Model Loan.js usa o page e o limit internos para calcular o OFFSET da query SQL
    const { page: _p, limit: _l, ...filters } = req.query;

    // 3. 🔥 ADICIONADO AWAIT: Aguarda o SQLite buscar os registros limitados da página
    const loans = await Loan.findAll({
      role: req.user.role,
      userId: req.user.id,
      page,
      limit,   
      ...filters,
    });

    // 4. 🔥 RESOLUÇÃO ASSÍNCRONA EM PARALELO: Mapeia e enriquece os itens com await seguro
    const enrichedLoans = await Promise.all(loans.map(async (loan) => {
      const bookData = await Book.findById(loan.book_id);
      const userData = await User.findById(loan.member_id);

      const dataRetirada = loan.loan_date || loan.created_at || loan.createdAt || loan.date || new Date().toISOString();
      let dataDevolucao = loan.return_date || loan.due_date || loan.dueDate;

      if (!dataDevolucao && dataRetirada && loan.due_days) {
        const dataCalculada = new Date(dataRetirada);
        dataCalculada.setDate(dataCalculada.getDate() + Number(loan.due_days));
        dataDevolucao = dataCalculada.toISOString();
      }

      return {
        ...loan,
        book_title: bookData ? bookData.title : (loan.book_title || `Livro ID: ${loan.book_id}`),
        user_name: userData ? userData.name : (loan.member_name || `Usuário ID: ${loan.member_id}`),
        loan_date: dataRetirada,
        return_date: dataDevolucao
      };
    }));

    // 5. 🔥 CONTADOR TOTAL ASSÍNCRONO: Puxa a contagem de registros totais sem o limite de paginação
    let totalLoansNoBanco = 0;
    if (Loan.count) {
      totalLoansNoBanco = await Loan.count({ role: req.user.role, userId: req.user.id, ...filters });
    } else {
      // Fallback caso a função count falhe por algum motivo
      totalLoansNoBanco = enrichedLoans.length;
    }

    // 6. Resposta estruturada para que o front-end consiga gerenciar o estado dos botões
    return res.json({
      page,
      limit,
      totalItems: totalLoansNoBanco, 
      totalPages: Math.ceil(totalLoansNoBanco / limit), 
      loans: enrichedLoans 
    });
  } catch (error) {
    console.error("Erro ao listar empréstimos no controller:", error);
    return res.status(500).json({ error: "Erro interno ao processar listagem." });
  }
}

// ── PATCH /loans/:id/reject ──────────────────────────────────────────────────
async function rejectLoan(req, res) {
  try {
    const { id } = req.params;
    const librarian_id = req.user.id;

    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({ error: 'Empréstimo/Reserva não encontrado.' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ 
        error: `Não é possível rejeitar este registro. O status atual é '${loan.status}'.` 
      });
    }

    const updatedLoan = await Loan.updateStatusAndLibrarian(id, 'rejected', librarian_id);

    return res.status(200).json({
      message: 'Solicitação de reserva rejeitada com sucesso.',
      loan: updatedLoan
    });
  } catch (error) {
    console.error("Erro ao rejeitar empréstimo:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}

// ── GET /loans/:id ────────────────────────────────────────────────────────────
async function getLoan(req, res) {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Empréstimo não encontrado.' });

    if (req.user.role === 'member' && loan.member_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    return res.json(loan);
  } catch (error) {
    console.error("Erro ao obter empréstimo por ID:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}

// ── GET /loans/overdue  (somente bibliotecário) ───────────────────────────────
async function listOverdue(req, res) {
  try {
    const loans = await Loan.findOverdue();
    return res.json(loans);
  } catch (error) {
    console.error("Erro ao listar empréstimos atrasados:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}

module.exports = { createLoan, returnLoan, listLoans, getLoan, listOverdue, rejectLoan, approveLoan };