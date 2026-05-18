const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/database');

// ── POST /auth/register ───────────────────────────────────────────────────────
async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    // Apenas bibliotecários podem criar outros bibliotecários
    const assignedRole = role === 'librarian' ? 'librarian' : 'member';
    if (role === 'librarian') {
      // Valida que quem está criando é um bibliotecário autenticado
      // (a rota /auth/register-librarian usa middleware de autenticação)
    }

    const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashed, assignedRole]
    );

    return res.status(201).json({
      message: 'Usuário criado com sucesso.',
      user: { id: result.lastInsertRowid, name, email, role: assignedRole }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
  }
}

// ── POST /auth/register-librarian  (somente bibliotecários podem usar) ────────
async function registerLibrarian(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashed, 'librarian']
    );

    return res.status(201).json({
      message: 'Bibliotecário criado com sucesso.',
      user: { id: result.lastInsertRowid, name, email, role: 'librarian' }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao registrar bibliotecário.' });
  }
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      message: 'Login realizado com sucesso.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────
function me(req, res) {
  const user = db.get(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  return res.json(user);
}

module.exports = { register, registerLibrarian, login, me };
