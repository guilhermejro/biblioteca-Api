const User = require('../models/User');

// ── GET /users (Somente Bibliotecário/Admin) ───────────────────────────────────
async function listUsers(req, res) {
  try {
    // PROTEÇÃO: Garante que apenas quem NÃO é 'member' (ou seja, lib/admin) liste os usuários
    if (req.user.role === 'member') {
      return res.status(403).json({ error: 'Acesso negado. Apenas funcionários.' });
    }

    const users = await User.findAll(req.query); // Adicionado await
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao listar usuários.' });
  }
}

// ── GET /users/:id ────────────────────────────────────────────────────────────
async function getUser(req, res) {
  try {
    const { id } = req.params;

    // Se for membro, só pode ver a si mesmo
    if (req.user.role === 'member' && req.user.id !== Number(id)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const user = await User.findById(id); // Adicionado await
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
}

// ── GET /users/:id/loans ──────────────────────────────────────────────────────
async function getUserLoans(req, res) {
  try {
    const { id } = req.params;

    // Se for membro, só pode ver seu próprio histórico
    if (req.user.role === 'member' && req.user.id !== Number(id)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const userExists = await User.findById(id); // Adicionado await
    if (!userExists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const loans = await User.getLoans(id); // Adicionado await
    return res.json(loans);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar empréstimos do usuário.' });
  }
}

// ── PUT /users/:id ────────────────────────────────────────────────────────────
async function updateUser(req, res) {
  try {
    const { id } = req.params;

    // Se for membro, só pode atualizar a si mesmo
    if (req.user.role === 'member' && req.user.id !== Number(id)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const userExists = await User.findById(id); // Adicionado await
    if (!userExists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const { email } = req.body || {};
    // Verifica se e-mail já está em uso por outro id
    if (email && await User.isEmailTaken(email, id)) { // Adicionado await
      return res.status(409).json({ error: 'E-mail já em uso.' });
    }

    const updated = await User.update(id, req.body);
    return res.json({ message: 'Usuário atualizado.', user: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
}

// ── DELETE /users/:id (Somente Bibliotecário/Admin) ───────────────────────────
async function deleteUser(req, res) {
  try {
    // PROTEÇÃO: Garante que apenas lib/admin possa deletar
    if (req.user.role === 'member') {
      return res.status(403).json({ error: 'Acesso negado. Apenas funcionários.' });
    }

    const user = await User.findById(req.params.id); // Adicionado await
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    // Validação de segurança para não deixar pontas soltas no banco
    const hasActive = await User.hasActiveLoans(req.params.id); // Adicionado await
    if (hasActive) {
      return res.status(409).json({ error: 'Usuário possui empréstimos ativos. Aguarde a devolução.' });
    }

    await User.delete(req.params.id); // Adicionado await
    return res.json({ message: 'Usuário removido.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar usuário.' });
  }
}

module.exports = { listUsers, getUser, getUserLoans, updateUser, deleteUser };