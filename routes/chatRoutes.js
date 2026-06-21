const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

// IMPORTAR MODELOS (sem importar o sequelize diretamente)
const Chat = require('../models/Chat');
const ChatParticipante = require('../models/ChatParticipante');
const Mensagem = require('../models/Mensagem');
const User = require('../models/User');
const UsuarioBloqueado = require('../models/UsuarioBloqueado');
const Denuncia = require('../models/Denuncia');
const NotificacaoAdmin = require('../models/NotificacaoAdmin');

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
// MIDDLEWARE DE ADMIN
// =============================================
const verificarAdmin = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.usuarioId);
        if (!user || !user.admin) {
            return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
        }
        req.admin = user;
        next();
    } catch (error) {
        console.error('Erro verificarAdmin:', error);
        res.status(500).json({ erro: error.message });
    }
};

// =============================================
// FUNÇÃO PARA CRIAR NOTIFICAÇÃO PARA ADMIN
// =============================================
async function criarNotificacaoAdmin(adminId, tipo, titulo, mensagem, link = null, dadosExtras = null) {
    try {
        await NotificacaoAdmin.create({
            admin_id: adminId,
            tipo: tipo,
            titulo: titulo,
            mensagem: mensagem,
            link: link,
            dados_extras: dadosExtras
        });
        console.log(`📬 Notificação criada para admin ${adminId}: ${titulo}`);
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
    }
}

// =============================================
// ROTAS DO CHAT
// =============================================

// Listar todos os chats do usuário - VERSÃO CORRIGIDA (sem ORDER BY problemático)
router.get('/chats', auth, async (req, res) => {
    try {
        const chatParticipantes = await ChatParticipante.findAll({
            where: { usuario_id: req.usuarioId },
            attributes: ['chat_id']
        });
        
        const chatIds = chatParticipantes.map(cp => cp.chat_id);
        
        if (chatIds.length === 0) {
            return res.json([]);
        }
        
        const chats = await Chat.findAll({
            where: { id: { [Op.in]: chatIds } },
            include: [
                {
                    model: User,
                    through: { attributes: [] },
                    attributes: ['id', 'display_name', 'email', 'avatar']
                }
            ]
        });
        
        console.log(`✅ Usuário ${req.usuarioId} tem ${chats.length} chats`);
        res.json(chats);
    } catch (error) {
        console.error('❌ Erro ao listar chats:', error);
        res.status(500).json({ erro: error.message });
    }
});

// Criar ou buscar chat existente com um usuário
router.post('/chats/usuario/:usuarioId', auth, async (req, res) => {
    try {
        const { usuarioId } = req.params;
        
        const chatsDoUsuario = await ChatParticipante.findAll({
            where: { usuario_id: req.usuarioId },
            attributes: ['chat_id']
        });
        
        const chatIds = chatsDoUsuario.map(cp => cp.chat_id);
        
        if (chatIds.length > 0) {
            const participantesDoOutro = await ChatParticipante.findAll({
                where: { 
                    usuario_id: usuarioId,
                    chat_id: { [Op.in]: chatIds }
                }
            });
            
            if (participantesDoOutro.length > 0) {
                const chatExistente = await Chat.findByPk(participantesDoOutro[0].chat_id, {
                    include: [{ model: User, through: { attributes: [] }, attributes: ['id', 'display_name', 'email', 'avatar'] }]
                });
                console.log(`✅ Chat existente encontrado: ${chatExistente.id}`);
                return res.json(chatExistente);
            }
        }
        
        const chat = await Chat.create({ tipo: 'individual' });
        console.log(`📌 Novo chat criado: ${chat.id}`);
        
        await ChatParticipante.create({ chat_id: chat.id, usuario_id: req.usuarioId });
        await ChatParticipante.create({ chat_id: chat.id, usuario_id: usuarioId });
        
        const chatCompleto = await Chat.findByPk(chat.id, {
            include: [{ model: User, through: { attributes: [] }, attributes: ['id', 'display_name', 'email', 'avatar'] }]
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
                    attributes: ['id', 'display_name', 'avatar']
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
            include: [{ model: User, as: 'remetente', attributes: ['id', 'display_name', 'avatar'] }]
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
            attributes: ['id', 'display_name', 'email', 'avatar', 'admin']
        });
        
        const usuariosFormatados = usuarios.map(user => ({
            id: user.id,
            nome: user.display_name,
            email: user.email,
            avatar: user.avatar,
            admin: user.admin || false
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
        const { motivo, descricao, imagem } = req.body;
        
        if (req.usuarioId == usuarioId) {
            return res.status(400).json({ erro: 'Não pode denunciar a si mesmo' });
        }
        
        const denuncia = await Denuncia.create({
            denunciante_id: req.usuarioId,
            denunciado_id: usuarioId,
            motivo: motivo,
            descricao: descricao || null,
            imagem: imagem || null
        });
        
        const denunciante = await User.findByPk(req.usuarioId);
        const denunciado = await User.findByPk(usuarioId);
        const admins = await User.findAll({ where: { admin: true } });
        
        for (const admin of admins) {
            await criarNotificacaoAdmin(
                admin.id,
                'nova_denuncia',
                '📢 Nova Denúncia',
                `${denunciante.display_name} denunciou ${denunciado.display_name} - Motivo: ${motivo}`,
                `/admin/denuncias/${denuncia.id}`,
                { denuncia_id: denuncia.id }
            );
        }
        
        console.log(`📢 Usuário ${req.usuarioId} denunciou ${usuarioId}`);
        res.json({ denunciado: true, mensagem: 'Denúncia enviada com sucesso' });
    } catch (error) {
        console.error('Erro ao denunciar:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// ROTAS ADMINISTRATIVAS
// =============================================

router.get('/admin/denuncias', auth, verificarAdmin, async (req, res) => {
    try {
        const denuncias = await Denuncia.findAll({
            include: [
                { model: User, as: 'denunciante', attributes: ['id', 'display_name', 'username', 'avatar'] },
                { model: User, as: 'denunciado', attributes: ['id', 'display_name', 'username', 'avatar'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(denuncias);
    } catch (error) {
        console.error('Erro ao listar denúncias:', error);
        res.status(500).json({ erro: error.message });
    }
});

router.put('/admin/denuncias/:denunciaId', auth, verificarAdmin, async (req, res) => {
    try {
        const { denunciaId } = req.params;
        const { status } = req.body;
        
        const denuncia = await Denuncia.findByPk(denunciaId);
        if (!denuncia) {
            return res.status(404).json({ erro: 'Denúncia não encontrada' });
        }
        
        await denuncia.update({ status: status });
        res.json({ mensagem: 'Denúncia atualizada com sucesso', denuncia });
    } catch (error) {
        console.error('Erro ao atualizar denúncia:', error);
        res.status(500).json({ erro: error.message });
    }
});

router.post('/admin/denuncias/:denunciaId/acao', auth, verificarAdmin, async (req, res) => {
    try {
        const { denunciaId } = req.params;
        const { acao, dias, observacao, usuario_afetado_id } = req.body;
        
        const denuncia = await Denuncia.findByPk(denunciaId);
        if (!denuncia) {
            return res.status(404).json({ erro: 'Denúncia não encontrada' });
        }
        
        const usuarioAfetado = await User.findByPk(usuario_afetado_id);
        if (!usuarioAfetado) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        
        let mensagem = '';
        let acaoAdmin = 'nenhuma';
        
        switch(acao) {
            case 'suspender':
                const diasSuspensao = dias || 5;
                const suspensaoAte = new Date();
                suspensaoAte.setDate(suspensaoAte.getDate() + diasSuspensao);
                await usuarioAfetado.update({
                    status: 'suspenso',
                    suspensao_ate: suspensaoAte,
                    motivo_banimento: observacao || `Suspenso por ${diasSuspensao} dias`
                });
                acaoAdmin = 'suspenso';
                mensagem = `Usuário ${usuarioAfetado.display_name} suspenso por ${diasSuspensao} dias`;
                break;
            case 'banir':
                await usuarioAfetado.update({
                    status: 'banido',
                    motivo_banimento: observacao || 'Banido devido à denúncia'
                });
                acaoAdmin = 'banido';
                mensagem = `Usuário ${usuarioAfetado.display_name} banido permanentemente`;
                break;
            case 'observacao':
                acaoAdmin = 'observacao';
                mensagem = `Usuário ${usuarioAfetado.display_name} marcado para observação`;
                break;
            case 'arquivar':
                acaoAdmin = 'arquivada';
                mensagem = `Denúncia #${denunciaId} arquivada sem ação`;
                break;
            default:
                return res.status(400).json({ erro: 'Ação inválida' });
        }
        
        await denuncia.update({
            status: acao === 'arquivar' ? 'arquivada' : 'analisada',
            acao_admin: acaoAdmin,
            observacao_admin: observacao,
            data_acao: new Date()
        });
        
        await criarNotificacaoAdmin(
            denuncia.denunciante_id,
            'denuncia_respondida',
            '📢 Atualização da sua denúncia',
            `Sua denúncia contra ${usuarioAfetado.display_name} foi analisada. Ação: ${acao}`,
            `/denuncias/${denunciaId}`
        );
        
        res.json({ mensagem: mensagem, acao: acaoAdmin });
    } catch (error) {
        console.error('Erro ao processar ação:', error);
        res.status(500).json({ erro: error.message });
    }
});

router.get('/admin/notificacoes', auth, verificarAdmin, async (req, res) => {
    try {
        const notificacoes = await NotificacaoAdmin.findAll({
            where: { admin_id: req.usuarioId },
            order: [['createdAt', 'DESC']]
        });
        res.json(notificacoes);
    } catch (error) {
        console.error('Erro ao listar notificações:', error);
        res.status(500).json({ erro: error.message });
    }
});

router.put('/admin/notificacoes/:notificacaoId/ler', auth, verificarAdmin, async (req, res) => {
    try {
        const { notificacaoId } = req.params;
        
        await NotificacaoAdmin.update(
            { lida: true },
            { where: { id: notificacaoId, admin_id: req.usuarioId } }
        );
        
        res.json({ mensagem: 'Notificação marcada como lida' });
    } catch (error) {
        console.error('Erro ao marcar notificação:', error);
        res.status(500).json({ erro: error.message });
    }
});

router.post('/admin/tornar-admin/:email', auth, verificarAdmin, async (req, res) => {
    try {
        const { email } = req.params;
        
        const user = await User.findOne({ where: { email: email } });
        if (!user) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        
        if (user.admin) {
            return res.status(400).json({ erro: 'Usuário já é administrador' });
        }
        
        await user.update({ admin: true });
        
        await criarNotificacaoAdmin(
            user.id,
            'novo_admin',
            '🎉 Você agora é administrador!',
            'Parabéns! Você foi promovido a administrador do Bem Bolado.',
            '/admin/dashboard'
        );
        
        res.json({ mensagem: `Usuário ${user.display_name} agora é administrador` });
    } catch (error) {
        console.error('Erro ao tornar admin:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// ROTA PARA FORNECER DADOS DO DENUNCIADO (APENAS ADMIN)
// =============================================
router.post('/admin/denuncias/:denunciaId/fornecer-dados', auth, verificarAdmin, async (req, res) => {
    try {
        const { denunciaId } = req.params;
        
        const denuncia = await Denuncia.findByPk(denunciaId);
        if (!denuncia) {
            return res.status(404).json({ erro: 'Denúncia não encontrada' });
        }
        
        if (denuncia.dados_fornecidos) {
            return res.status(400).json({ erro: 'Dados já foram fornecidos para esta denúncia' });
        }
        
        // Buscar dados do denunciado
        const denunciado = await User.findByPk(denuncia.denunciado_id, {
            attributes: ['id', 'display_name', 'username', 'email', 'cpf']
        });
        
        if (!denunciado) {
            return res.status(404).json({ erro: 'Usuário denunciado não encontrado' });
        }
        
        // Marcar como fornecidos
        await denuncia.update({
            dados_fornecidos: true,
            data_fornecimento: new Date()
        });
        
        // Criar notificação para o denunciante com os dados
        await criarNotificacaoAdmin(
            denuncia.denunciante_id,
            'dados_fornecidos',
            '📋 Dados do usuário denunciado',
            `Os dados do usuário ${denunciado.display_name} foram liberados para você.\n\n📛 Nome: ${denunciado.display_name}\n👤 Usuário: @${denunciado.username}\n📧 Email: ${denunciado.email}\n📄 CPF: ${denunciado.cpf}`,
            `/denuncias/${denunciaId}`,
            { 
                nome: denunciado.display_name,
                username: denunciado.username,
                email: denunciado.email,
                cpf: denunciado.cpf,
                denuncia_id: denunciaId
            }
        );
        
        console.log(`📤 Admin forneceu dados da denúncia ${denunciaId} para o denunciante ${denuncia.denunciante_id}`);
        
        res.json({
            mensagem: 'Dados fornecidos com sucesso! O denunciante foi notificado.',
            dados: {
                nome: denunciado.display_name,
                username: denunciado.username,
                email: denunciado.email,
                cpf: denunciado.cpf
            }
        });
        
    } catch (error) {
        console.error('Erro ao fornecer dados:', error);
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;
