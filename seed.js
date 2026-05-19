const database = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function resetarBanco() {
  try {
    console.log("🔄 Inicializando um novo banco de dados do zero...");
    
    // O initDb vai criar o arquivo database.sqlite novo e rodar o 'createTables' automaticamente
    await database.initDb();

    console.log("🔑 Gerando credenciais do Administrador (Túlio)...");
    // Gera o hash nativo da senha 123456
    const hashSenha = await bcrypt.hash('123456', 10);

    // Insere o Túlio diretamente como librarian
    database.run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      ['Tulio', 'admin@gmail.com', hashSenha, 'librarian']
    );

    // Salva fisicamente no disco
    database.saveDb();

    console.log("✨ BANCO RESETADO COM SUCESSO!");
    console.log("👤 Usuário criado: admin@gmail.com | Senha: 123456 | Cargo: librarian");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao resetar o banco:", error.message);
    process.exit(1);
  }
}

resetarBanco();