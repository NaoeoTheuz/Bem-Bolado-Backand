const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/perfil', authMiddleware, userController.getPerfil);
router.put('/perfil', authMiddleware, userController.atualizarPerfil);
router.put('/configuracoes', authMiddleware, userController.atualizarConfiguracoes);

module.exports = router;