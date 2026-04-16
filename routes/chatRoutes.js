const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const Chat = require('../models/Chat');
const ChatParticipante = require('../models/ChatParticipante');
const Mensagem = require('../models/Mensagem');
const User = require('../models/User');

// Middleware de autenticação
const auth = async (req, res, next) => {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ erro: 'Token não fornecido' });
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuarioId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ erro: 'Token inválido' });
    }
};

// Listar todos os chats do usuário
router.get('/chats', auth, async (req, res) => {
    try {
        const chats = await Chat.findAll({
            include: [
                {
                    model: User,
                    where: { id: req.usuarioId },
                    through: { attributes: [] },
                    attributes: []
                },
                {
                    model: User,
                    through: { attributes: [] },
                    attributes: ['id', 'nome', 'email']
                },
                {
                    model: Mensagem,
                    limit: 1,
                    order: [['createdAt', 'DESC']],
                    required: false
                }
            ],
            order: [[{ model: Mensagem }, 'createdAt', 'DESC']]
        });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Criar ou buscar chat existente com um usuário
router.post('/chats/usuario/:usuarioId', auth, async (req, res) => {
    try {
        const { usuarioId } = req.params;
        
        // Buscar chat existente entre os dois
        const chatsUsuario = await Chat.findAll({
            include: [
                {
                    model: User,
                    where: { id: req.usuarioId },
                    through: { attributes: [] }
                },
                {
                    model: User,
                    where: { id: usuarioId },
                    through: { attributes: [] }
                }
            ]
        });
        
        if (chatsUsuario.length > 0) {
            return res.json(chatsUsuario[0]);
        }
        
        // Criar novo chat
        const chat = await Chat.create({ tipo: 'individual' });
        
        await ChatParticipante.create({ chat_id: chat.id, usuario_id: req.usuarioId });
        await ChatParticipante.create({ chat_id: chat.id, usuario_id: usuarioId });
        
        const chatCompleto = await Chat.findByPk(chat.id, {
            include: [{ model: User, through: { attributes: [] }, attributes: ['id', 'nome', 'email'] }]
        });
        
        res.status(201).json(chatCompleto);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Buscar todas as mensagens de um chat (NÃO APAGA NUNCA)
router.get('/chats/:chatId/mensagens', auth, async (req, res) => {
    try {
        const mensagens = await Mensagem.findAll({
            where: { chat_id: req.params.chatId },
            include: [
                {
                    model: User,
                    as: 'remetente',
                    attributes: ['id', 'nome']
                }
            ],
            order: [['createdAt', 'ASC']]
        });
        res.json(mensagens);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Enviar mensagem
router.post('/chats/:chatId/mensagens', auth, async (req, res) => {
    try {
        const { conteudo } = req.body;
        
        const mensagem = await Mensagem.create({
            chat_id: req.params.chatId,
            remetente_id: req.usuarioId,
            conteudo: conteudo
        });
        
        const mensagemCompleta = await Mensagem.findByPk(mensagem.id, {
            include: [{ model: User, as: 'remetente', attributes: ['id', 'nome'] }]
        });
        
        res.status(201).json(mensagemCompleta);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Buscar todos os usuários (exceto o atual)
router.get('/usuarios', auth, async (req, res) => {
    try {
        const usuarios = await User.findAll({
            where: { id: { [Op.ne]: req.usuarioId } },
            attributes: ['id', 'nome', 'email']
        });
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Marcar mensagens como lidas
router.put('/chats/:chatId/ler', auth, async (req, res) => {
    try {
        await Mensagem.update(
            { lida: true },
            { 
                where: { 
                    chat_id: req.params.chatId,
                    remetente_id: { [Op.ne]: req.usuarioId }
                }
            }
        );
        res.json({ mensagem: 'Mensagens marcadas como lidas' });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;
