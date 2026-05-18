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
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    const cyan = '\x1b[36m';
    const green = '\x1b[32m';
    const blue = '\x1b[34m';
    const yellow = '\x1b[33m';
    const red = '\x1b[31m';
    const gray = '\x1b[90m';

    console.log(`\n${cyan}┌────────────────────────────────────────────────────────────────────────┐${reset}`);
    console.log(`${cyan}│${reset}  🚀  ${bold}Library API${reset} rodando com sucesso em: ${cyan}http://localhost:${PORT.toString().padEnd(16)}${reset}${cyan}│${reset}`);
    console.log(`${cyan}└────────────────────────────────────────────────────────────────────────┘${reset}`);
    console.log(`   📋 ${bold}ROTAS DISPONÍVEIS NA API:${reset}`);
    
    console.log(`\n   ${bold}${cyan}[Autenticação]${reset}`);
    console.log(`   ├── ${green}POST${reset}   /auth/register              ${gray}→ Registrar membro${reset}`);
    console.log(`   ├── ${green}POST${reset}   /auth/register-librarian    ${gray}→ Registrar bibliotecário [auth]${reset}`);
    console.log(`   ├── ${green}POST${reset}   /auth/login                 ${gray}→ Login${reset}`);
    console.log(`   └── ${blue}GET${reset}    /auth/me                    ${gray}→ Dados do usuário logado${reset}`);

    console.log(`\n   ${bold}${cyan}[Livros]${reset}`);
    console.log(`   ├── ${blue}GET${reset}    /books                      ${gray}→ Listar livros${reset}`);
    console.log(`   ├── ${blue}GET${reset}    /books/:id                  ${gray}→ Detalhe do livro${reset}`);
    console.log(`   ├── ${green}POST${reset}   /books                      ${gray}→ Cadastrar livro [lib]${reset}`);
    console.log(`   ├── ${yellow}PUT${reset}    /books/:id                  ${gray}→ Editar livro [lib]${reset}`);
    console.log(`   └── ${red}DELETE${reset} /books/:id                  ${gray}→ Remover livro [lib]${reset}`);

    console.log(`\n   ${bold}${cyan}[Empréstimos]${reset}`);
    console.log(`   ├── ${blue}GET${reset}    /loans                      ${gray}→ Listar empréstimos${reset}`);
    console.log(`   ├── ${blue}GET${reset}    /loans/overdue              ${gray}→ Empréstimos vencidos [lib]${reset}`);
    console.log(`   ├── ${blue}GET${reset}    /loans/:id                  ${gray}→ Detalhe do empréstimo${reset}`);
    console.log(`   ├── ${green}POST${reset}   /loans                      ${gray}→ Criar empréstimo [lib]${reset}`);
    console.log(`   ├── ${red}PATCH${reset}  /loans/:id/return           ${gray}→ Registrar devolução [lib]${reset}`);
    console.log(`   ├── ${red}PATCH${reset}  /loans/:id/approve          ${gray}→ Aprovar reserva pendente [lib]${reset}`);
    console.log(`   └── ${red}PATCH${reset}  /loans/:id/reject           ${gray}→ Recusar pedido de empréstimo [lib]${reset}`);

    console.log(`\n   ${bold}${cyan}[Usuários]${reset}`);
    console.log(`   ├── ${blue}GET${reset}    /users                      ${gray}→ Listar usuários [lib]${reset}`);
    console.log(`   ├── ${blue}GET${reset}    /users/:id                  ${gray}→ Detalhe do usuário${reset}`);
    console.log(`   ├── ${blue}GET${reset}    /users/:id/loans            ${gray}→ Histórico de empréstimos${reset}`);
    console.log(`   ├── ${yellow}PUT${reset}    /users/:id                  ${gray}→ Atualizar usuário${reset}`);
    console.log(`   └── ${red}DELETE${reset} /users/:id                  ${gray}→ Remover usuário [lib]${reset}`);
    console.log(`\n${cyan}───────────────────────────────────────────────────────────────────────────${reset}\n`);
    
  });
});
