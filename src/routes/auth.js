const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

// Registro público de membros
router.post('/register', ctrl.register);

// Registro de bibliotecários — requer auth de bibliotecário
router.post('/register-librarian', authenticate, authorize('librarian'), ctrl.registerLibrarian);

// Login (qualquer role)
router.post('/login', ctrl.login);

// Dados do usuário logado
router.get('/me', authenticate, ctrl.me);

module.exports = router;
