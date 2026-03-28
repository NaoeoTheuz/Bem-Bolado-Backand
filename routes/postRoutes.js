const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, postController.criarPost);
router.get('/', authMiddleware, postController.listarPosts);
router.post('/:id/curtir', authMiddleware, postController.toggleCurtida);
router.post('/:id/salvar', authMiddleware, postController.toggleSalvar);
router.delete('/:id', authMiddleware, postController.excluirPost);

module.exports = router;