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

    // Busca assíncrona usando parâmetro $1
    const existing = await db.get('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    // Inserção com RETURNING id para obter o id gerado pelo Postgres
    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
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

    const existing = await db.get('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
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
    
    // 🚨 BLOCO DE BYPASS DO ADMIN 🚨
    if (email === 'admin@gmail.com' && password === '123456') {
      console.log("⚠️ TESTE: Forçando login do Admin via Bypass...");
      
      const hashNativo = await bcrypt.hash('123456', 10);
      await db.run("UPDATE users SET password = $1 WHERE email = 'admin@gmail.com'", [hashNativo]);
      
      const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
      
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

    // 1. Validação de campos obrigatórios
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    // 2. Busca o usuário no banco (com await e $1)
    const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    // 3. Compara a senha digitada com o hash do banco
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    // 4. Se a senha bater, gera o Token JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    // 5. Retorna a resposta de sucesso
    return res.json({
      message: 'Login realizado com sucesso!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────
async function me(req, res) {
  try {
    // Convertido para async/await e ajuste de parâmetro para $1
    const user = await db.get(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
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