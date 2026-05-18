require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { initDb } = require('./config/database');

const app = express();

// ── Middlewares globais ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Rotas ─────────────────────────────────────────────────────────────────────
app.use('/auth',  require('./routes/auth'));
app.use('/books', require('./routes/books'));
app.use('/loans', require('./routes/loans'));
app.use('/users', require('./routes/users'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '📚 Library API online', version: '1.0.0' });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

// ── Inicia o servidor após o banco estar pronto ───────────────────────────────
const PORT = process.env.PORT || 3000;
// Substitua a inicialização do servidor por esta:
initDb().then(() => {
  // 🔥 ADICIONADO '0.0.0.0': Informa ao Express para escutar toda a rede local
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando localmente em http://localhost:${PORT}`);
    console.log('\n📋 Rotas disponíveis:');
    console.log('  POST   /auth/register              → Registrar membro');
    console.log('  POST   /auth/register-librarian    → Registrar bibliotecário (auth requerida)');
    console.log('  POST   /auth/login                 → Login');
    console.log('  GET    /auth/me                    → Dados do usuário logado');
    console.log('  ─────────────────────────────────────────────────────');
    console.log('  GET    /books                      → Listar livros');
    console.log('  GET    /books/:id                  → Detalhe do livro');
    console.log('  POST   /books                      → Cadastrar livro [lib]');
    console.log('  PUT    /books/:id                  → Editar livro [lib]');
    console.log('  DELETE /books/:id                  → Remover livro [lib]');
    console.log('  ─────────────────────────────────────────────────────');
    console.log('  GET    /loans                      → Listar empréstimos');
    console.log('  GET    /loans/overdue              → Empréstimos vencidos [lib]');
    console.log('  GET    /loans/:id                  → Detalhe do empréstimo');
    console.log('  POST   /loans                      → Criar empréstimo [lib]');
    console.log('  PATCH  /loans/:id/return           → Registrar devolução [lib]');
    console.log('  PATCH  /loans/:id/approve          → Aprovar reserva pendente [lib]');
    console.log('  PATCH  /loans/:id/reject          → Recusar pedido de empréstimo [lib]');
    console.log('  ─────────────────────────────────────────────────────');
    console.log('  GET    /users                      → Listar usuários [lib]');
    console.log('  GET    /users/:id                  → Detalhe do usuário');
    console.log('  GET    /users/:id/loans            → Histórico de empréstimos');
    console.log('  PUT    /users/:id                  → Atualizar usuário');
    console.log('  DELETE /users/:id                  → Remover usuário [lib]');
    
  });
});
