const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const Chat = require('../models/Chat');
const ChatParticipante = require('../models/ChatParticipante');
const Mensagem = require('../models/Mensagem');
const User = require('../models/User');
const UsuarioBloqueado = require('../models/UsuarioBloqueado');
const Denuncia = require('../models/Denuncia');

// =============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// =============================================
const auth = async (req, res, next) => {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ erro: 'Token não fornecido' });
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuarioId = decoded.usuarioId || decoded.id;
        console.log('✅ Usuário autenticado ID:', req.usuarioId);
        next();
    } catch (err) {
        console.error('❌ Erro na autenticação:', err);
        res.status(401).json({ erro: 'Token inválido' });
    }
};

// =============================================
// ROTAS DO CHAT
// =============================================

// Listar todos os chats do usuário
router.get('/chats', auth, async (req, res) => {
    try {
        const chats = await Chat.findAll({
            include: [
                {
                    model: User,
                    through: { attributes: [] },
                    attributes: ['id', 'display_name', 'email']
                }
            ]
        });
        
        const chatsDoUsuario = chats.filter(chat => {
            return chat.Users?.some(user => user.id == req.usuarioId);
        });
        
        console.log(`✅ Encontrados ${chatsDoUsuario.length} chats para o usuário ${req.usuarioId}`);
        res.json(chatsDoUsuario);
    } catch (error) {
        console.error('❌ Erro ao listar chats:', error);
        res.status(500).json({ erro: error.message });
    }
});

// Criar ou buscar chat existente com um usuário
router.post('/chats/usuario/:usuarioId', auth, async (req, res) => {
    try {
        const { usuarioId } = req.params;
        
        const chatsExistentes = await Chat.findAll({
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
        
        if (chatsExistentes.length > 0) {
            console.log(`✅ Chat existente encontrado: ${chatsExistentes[0].id}`);
            const chatExistente = await Chat.findByPk(chatsExistentes[0].id, {
                include: [{ model: User, through: { attributes: [] }, attributes: ['id', 'display_name', 'email'] }]
            });
            return res.json(chatExistente);
        }
        
        const chat = await Chat.create({ tipo: 'individual' });
        console.log(`📌 Novo chat criado: ${chat.id}`);
        
        await ChatParticipante.create({ chat_id: chat.id, usuario_id: req.usuarioId });
        await ChatParticipante.create({ chat_id: chat.id, usuario_id: usuarioId });
        
        const chatCompleto = await Chat.findByPk(chat.id, {
            include: [{ model: User, through: { attributes: [] }, attributes: ['id', 'display_name', 'email'] }]
        });
        
        res.status(201).json(chatCompleto);
    } catch (error) {
        console.error('❌ Erro ao criar chat:', error);
        res.status(500).json({ erro: error.message });
    }
});

// Buscar todas as mensagens de um chat
router.get('/chats/:chatId/mensagens', auth, async (req, res) => {
    try {
        const mensagens = await Mensagem.findAll({
            where: { chat_id: req.params.chatId },
            include: [
                {
                    model: User,
                    as: 'remetente',
                    attributes: ['id', 'display_name']
                }
            ],
            order: [['createdAt', 'ASC']]
        });
        res.json(mensagens);
    } catch (error) {
        console.error('❌ Erro ao buscar mensagens:', error);
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
            include: [{ model: User, as: 'remetente', attributes: ['id', 'display_name'] }]
        });
        
        res.status(201).json(mensagemCompleta);
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.status(500).json({ erro: error.message });
    }
});

// Buscar todos os usuários (exceto o atual)
router.get('/usuarios', auth, async (req, res) => {
    try {
        const usuarios = await User.findAll({
            where: { id: { [Op.ne]: req.usuarioId } },
            attributes: ['id', 'display_name', 'email']
        });
        
        const usuariosFormatados = usuarios.map(user => ({
            id: user.id,
            nome: user.display_name,
            email: user.email
        }));
        
        res.json(usuariosFormatados);
    } catch (error) {
        console.error('❌ Erro ao buscar usuários:', error);
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
        console.error('❌ Erro ao marcar como lidas:', error);
        res.status(500).json({ erro: error.message });
    }
});

// Rota para indicar que o usuário está digitando
router.post('/chats/:chatId/digitando', auth, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { digitando } = req.body;
        
        console.log(`✏️ Usuário ${req.usuarioId} ${digitando ? 'está digitando' : 'parou de digitar'} no chat ${chatId}`);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erro ao processar digitando:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// APAGAR MENSAGEM (apenas o remetente pode apagar)
// =============================================
router.delete('/chats/:chatId/mensagens/:mensagemId', auth, async (req, res) => {
    try {
        const { chatId, mensagemId } = req.params;
        
        console.log(`🗑️ Apagando mensagem ${mensagemId} do chat ${chatId} - Usuário: ${req.usuarioId}`);
        
        const mensagem = await Mensagem.findOne({
            where: { 
                id: mensagemId,
                chat_id: chatId,
                remetente_id: req.usuarioId
            }
        });
        
        if (!mensagem) {
            return res.status(404).json({ erro: 'Mensagem não encontrada ou você não tem permissão' });
        }
        
        await mensagem.destroy();
        
        console.log(`✅ Mensagem ${mensagemId} apagada com sucesso`);
        res.json({ mensagem: 'Mensagem apagada com sucesso' });
        
    } catch (error) {
        console.error('❌ Erro ao apagar mensagem:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// BLOQUEAR USUÁRIO
// =============================================
router.post('/bloquear/:usuarioId', auth, async (req, res) => {
    try {
        const { usuarioId } = req.params;
        
        if (req.usuarioId == usuarioId) {
            return res.status(400).json({ erro: 'Não pode bloquear a si mesmo' });
        }
        
        const [bloqueio, created] = await UsuarioBloqueado.findOrCreate({
            where: {
                usuario_id: req.usuarioId,
                bloqueado_id: usuarioId
            },
            defaults: {
                usuario_id: req.usuarioId,
                bloqueado_id: usuarioId
            }
        });
        
        if (created) {
            console.log(`🔒 Usuário ${req.usuarioId} bloqueou ${usuarioId}`);
            res.json({ bloqueado: true, mensagem: 'Usuário bloqueado com sucesso' });
        } else {
            res.json({ bloqueado: false, mensagem: 'Usuário já estava bloqueado' });
        }
    } catch (error) {
        console.error('Erro ao bloquear:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// DESBLOQUEAR USUÁRIO
// =============================================
router.delete('/bloquear/:usuarioId', auth, async (req, res) => {
    try {
        const { usuarioId } = req.params;
        
        await UsuarioBloqueado.destroy({
            where: {
                usuario_id: req.usuarioId,
                bloqueado_id: usuarioId
            }
        });
        
        console.log(`🔓 Usuário ${req.usuarioId} desbloqueou ${usuarioId}`);
        res.json({ desbloqueado: true, mensagem: 'Usuário desbloqueado' });
    } catch (error) {
        console.error('Erro ao desbloquear:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// VERIFICAR SE ESTÁ BLOQUEADO
// =============================================
router.get('/bloqueado/:usuarioId', auth, async (req, res) => {
    try {
        const { usuarioId } = req.params;
        
        const bloqueado = await UsuarioBloqueado.findOne({
            where: {
                usuario_id: req.usuarioId,
                bloqueado_id: usuarioId
            }
        });
        
        res.json({ bloqueado: !!bloqueado });
    } catch (error) {
        console.error('Erro ao verificar bloqueio:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// DENUNCIAR USUÁRIO
// =============================================
router.post('/denunciar/:usuarioId', auth, async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const { motivo, descricao } = req.body;
        
        if (req.usuarioId == usuarioId) {
            return res.status(400).json({ erro: 'Não pode denunciar a si mesmo' });
        }
        
        const denuncia = await Denuncia.create({
            denunciante_id: req.usuarioId,
            denunciado_id: usuarioId,
            motivo: motivo,
            descricao: descricao || null
        });
        
        console.log(`📢 Usuário ${req.usuarioId} denunciou ${usuarioId} - Motivo: ${motivo}`);
        res.json({ denunciado: true, mensagem: 'Denúncia enviada com sucesso' });
    } catch (error) {
        console.error('Erro ao denunciar:', error);
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;
