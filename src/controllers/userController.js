const User = require('../models/User');

// ── GET /users (Somente Bibliotecário/Admin) ───────────────────────────────────
async function listUsers(req, res) {
  try {
    if (req.user.role === 'member') {
      return res.status(403).json({ error: 'Acesso negado. Apenas funcionários.' });
    }

    const users = await User.findAll(req.query);
    return res.json(users);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return res.status(500).json({ error: 'Erro interno ao listar usuários.' });
  }
}

// ── GET /users/:id ────────────────────────────────────────────────────────────
async function getUser(req, res) {
  try {
    const { id } = req.params;

    if (req.user.role === 'member' && req.user.id !== Number(id)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    
    return res.json(user);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
}

// ── GET /users/:id/loans ──────────────────────────────────────────────────────
async function getUserLoans(req, res) {
  try {
    const { id } = req.params;

    if (req.user.role === 'member' && req.user.id !== Number(id)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const userExists = await User.findById(id);
    if (!userExists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const loans = await User.getLoans(id);
    return res.json(loans);
  } catch (error) {
    console.error("Erro ao buscar empréstimos do usuário:", error);
    return res.status(500).json({ error: 'Erro ao buscar empréstimos do usuário.' });
  }
}

// ── PUT /users/:id ────────────────────────────────────────────────────────────
async function updateUser(req, res) {
  try {
    const { id } = req.params;

    if (req.user.role === 'member' && req.user.id !== Number(id)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const userExists = await User.findById(id);
    if (!userExists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const { email } = req.body || {};
    if (email && (await User.isEmailTaken(email, id))) {
      return res.status(409).json({ error: 'E-mail já em uso.' });
    }

    const updated = await User.update(id, req.body);
    return res.json({ message: 'Usuário atualizado.', user: updated });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
}

// ── DELETE /users/:id (Somente Bibliotecário/Admin) ───────────────────────────
async function deleteUser(req, res) {
  try {
    if (req.user.role === 'member') {
      return res.status(403).json({ error: 'Acesso negado. Apenas funcionários.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const hasActive = await User.hasActiveLoans(req.params.id);
    if (hasActive) {
      return res.status(409).json({ error: 'Usuário possui empréstimos ativos. Aguarde a devolução.' });
    }

    await User.delete(req.params.id);
    return res.json({ message: 'Usuário removido.' });
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    return res.status(500).json({ error: 'Erro ao deletar usuário.' });
  }
}

module.exports = { listUsers, getUser, getUserLoans, updateUser, deleteUser };