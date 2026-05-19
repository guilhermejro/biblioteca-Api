const router = require('express').Router();
const ctrl   = require('../controllers/loanController');
const { authenticate, authorize } = require('../middleware/auth');

// Listar empréstimos (bibliotecário vê todos, membro vê os seus)
router.get('/',           authenticate, ctrl.listLoans);

// Listar empréstimos vencidos (somente bibliotecário)
router.get('/overdue',    authenticate, authorize('librarian'), ctrl.listOverdue);

// Detalhe de um empréstimo
router.get('/:id',        authenticate, ctrl.getLoan);

// Criar empréstimo (Agora membros TAMBÉM podem acessar para pedir a reserva!)
router.post('/',          authenticate, ctrl.createLoan);

// Registrar devolução (somente bibliotecário)
router.patch('/:id/return', authenticate, authorize('librarian'), ctrl.returnLoan);

// Aprovar reserva pendente (Ajustado os nomes e o caminho da URL!)
router.patch('/:id/approve', authenticate, authorize('librarian'), ctrl.approveLoan);

// Recusar reserva pendente (somente bibliotecário)
// Adicionada para limpar o painel de solicitações negadas
router.patch('/:id/reject',  authenticate, authorize('librarian'), ctrl.rejectLoan);

module.exports = router;
