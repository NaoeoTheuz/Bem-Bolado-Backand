const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, postController.criarPost);
router.get('/', authMiddleware, postController.listarPosts);
router.post('/:id/curtir', authMiddleware, postController.toggleCurtida);
router.post('/:id/salvar', authMiddleware, postController.toggleSalvar);
router.delete('/:id', authMiddleware, postController.excluirPost);

router.post('/:id/tornar-premium', authMiddleware, postController.tornarPremium);
router.get('/:id/verificar-premium', authMiddleware, postController.verificarPremium);

module.exports = router;
