const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/perfil', authMiddleware, userController.getPerfil);
router.put('/perfil', authMiddleware, userController.atualizarPerfil);
router.put('/configuracoes', authMiddleware, userController.atualizarConfiguracoes);
router.put('/avatar', authMiddleware, userController.atualizarAvatar);

// =============================================
// NOVAS ROTAS PARA PERFIL PÚBLICO E SEGUIDORES
// =============================================
router.get('/:username', authMiddleware, userController.getPerfilByUsername);
router.get('/:id/posts', authMiddleware, userController.getPostsByUser);
router.get('/:id/seguidores', authMiddleware, userController.getSeguidores);
router.get('/:id/seguindo', authMiddleware, userController.getSeguindo);
router.post('/:id/seguir', authMiddleware, userController.seguir);
router.delete('/:id/seguir', authMiddleware, userController.deixarSeguir);

module.exports = router;
