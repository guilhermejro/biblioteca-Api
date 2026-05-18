const router = require('express').Router();
const ctrl   = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

// Listar usuários (somente bibliotecário)
router.get('/',              authenticate, authorize('librarian'), ctrl.listUsers);

// Detalhe (bibliotecário ou o próprio usuário)
router.get('/:id',           authenticate, ctrl.getUser);

// Histórico de empréstimos do usuário (bibliotecário ou o próprio)
router.get('/:id/loans',     authenticate, ctrl.getUserLoans);

// Atualizar dados (bibliotecário ou o próprio usuário)
router.put('/:id',           authenticate, ctrl.updateUser);

// Remover usuário (somente bibliotecário)
router.delete('/:id',        authenticate, authorize('librarian'), ctrl.deleteUser);

module.exports = router;
