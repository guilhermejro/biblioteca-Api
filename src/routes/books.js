const router = require('express').Router();
const ctrl   = require('../controllers/bookController');
const { authenticate, authorize } = require('../middleware/auth');

// Qualquer usuário autenticado pode consultar livros
router.get('/',    authenticate, ctrl.listBooks);
router.get('/:id', authenticate, ctrl.getBook);

// Somente bibliotecário pode cadastrar, editar e remover
router.post('/',    authenticate, authorize('librarian'), ctrl.createBook);
router.put('/:id',  authenticate, authorize('librarian'), ctrl.updateBook);
router.delete('/:id', authenticate, authorize('librarian'), ctrl.deleteBook);

module.exports = router;
