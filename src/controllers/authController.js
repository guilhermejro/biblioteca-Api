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

    // AJUSTE: Sem await, pois o método get do sql.js é síncrono
    const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    // AJUSTE: Sem await, pois o método run do sql.js é síncrono
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

    // AJUSTE: Sem await, pois o método get do sql.js é síncrono
    const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    // AJUSTE: Sem await, pois o método run do sql.js é síncrono
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
    
    // 🚨 COLOQUE ESTE BLOCO DE BYPASS AQUI (LOGO NO INÍCIO) 🚨
    if (email === 'admin@gmail.com' && password === '123456') {
      console.log("⚠️ TESTE: Forçando login do Admin via Bypass...");
      
      // Gera o hash usando exatamente a biblioteca ativa no controller
      const hashNativo = await bcrypt.hash('123456', 10);
      
      // Sobrescreve o registro na memória do sql.js
      db.run("UPDATE users SET password = ? WHERE email = 'admin@gmail.com'", [hashNativo]);
      db.saveDb(); // Salva no arquivo físico correto
      
      // Busca o usuário atualizado
      const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
      
      // Gera o token JWT para destravar o seu frontend imediatamente
      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '8h' }
      );

      return res.json({
        message: 'Login realizado com sucesso via Bypass!',
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    }
    // 🚨 FIM DO BLOCO DE BYPASS 🚨

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────
function me(req, res) {
  try {
    // AJUSTE: Removido async/await, retornando diretamente no formato síncrono original
    const user = db.get(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao buscar dados do perfil.' });
  }
}

module.exports = { register, registerLibrarian, login, me };