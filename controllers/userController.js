const User = require('../models/User');

// =============================================
// PERFIL DO USUÁRIO
// =============================================

// Buscar perfil do usuário logado
exports.getPerfil = async (req, res) => {
    try {
        const user = await User.findByPk(req.usuarioId, {
            attributes: { exclude: ['senha'] }
        });
        
        if (!user) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        
        // Log para debug
        console.log('Admin value for user', user.display_name, ':', user.admin);
        
        // Garantir que o campo admin seja enviado
        const userData = user.toJSON();
        
        res.json(userData);
    } catch (err) {
        console.error('Erro getPerfil:', err);
        res.status(500).json({ msg: 'Erro no servidor' });
    }
};

// Atualizar perfil (display_name, bio, tema_escuro)
exports.atualizarPerfil = async (req, res) => {
    try {
        const { display_name, bio, tema_escuro } = req.body;
        
        const updateData = {};
        if (display_name !== undefined) updateData.display_name = display_name;
        if (bio !== undefined) updateData.bio = bio;
        if (tema_escuro !== undefined) updateData.tema_escuro = tema_escuro;
        
        await User.update(updateData, {
            where: { id: req.usuarioId }
        });
        
        // Buscar usuário atualizado para retornar
        const userUpdated = await User.findByPk(req.usuarioId, {
            attributes: { exclude: ['senha'] }
        });
        
        res.json({ 
            msg: 'Perfil atualizado com sucesso',
            usuario: userUpdated
        });
    } catch (err) {
        console.error('Erro atualizarPerfil:', err);
        res.status(500).json({ msg: 'Erro ao atualizar perfil' });
    }
};

// Atualizar configurações (notificações, privacidade)
exports.atualizarConfiguracoes = async (req, res) => {
    try {
        const { tema_escuro, notificacoes_curtidas, notificacoes_comentarios, privado } = req.body;
        
        const updateData = {};
        if (tema_escuro !== undefined) updateData.tema_escuro = tema_escuro;
        if (notificacoes_curtidas !== undefined) updateData.notificacoes_curtidas = notificacoes_curtidas;
        if (notificacoes_comentarios !== undefined) updateData.notificacoes_comentarios = notificacoes_comentarios;
        if (privado !== undefined) updateData.privado = privado;
        
        await User.update(updateData, {
            where: { id: req.usuarioId }
        });
        
        res.json({ msg: 'Configurações atualizadas com sucesso' });
    } catch (err) {
        console.error('Erro atualizarConfiguracoes:', err);
        res.status(500).json({ msg: 'Erro ao atualizar configurações' });
    }
};

// =============================================
// ATUALIZAR AVATAR (VERSÃO CORRIGIDA COM LOGS)
// =============================================
exports.atualizarAvatar = async (req, res) => {
    try {
        const { avatar } = req.body;
        
        console.log('📸 Recebendo requisição de avatar');
        console.log('📏 ID do usuário:', req.usuarioId);
        console.log('📊 Avatar recebido?', avatar ? 'SIM' : 'NÃO');
        
        if (!avatar) {
            return res.status(400).json({ msg: 'Avatar não fornecido' });
        }
        
        // Verificar o tamanho
        const tamanhoKB = (avatar.length / 1024).toFixed(2);
        console.log(`📏 Tamanho do Base64: ${tamanhoKB} KB`);
        
        // Atualizar o avatar
        const [rowsUpdated] = await User.update(
            { avatar: avatar },
            { where: { id: req.usuarioId } }
        );
        
        console.log(`✅ Linhas atualizadas: ${rowsUpdated}`);
        
        if (rowsUpdated === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        
        res.json({ avatar: avatar, msg: 'Avatar atualizado com sucesso' });
        
    } catch (err) {
        console.error('❌ Erro detalhado ao atualizar avatar:', err);
        res.status(500).json({ msg: 'Erro ao atualizar avatar: ' + err.message });
    }
};

// =============================================
// NOVAS FUNÇÕES PARA PERFIL PÚBLICO E SEGUIDORES
// =============================================

// Buscar perfil por username
exports.getPerfilByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        
        const user = await User.findOne({
            where: { username },
            attributes: ['id', 'username', 'display_name', 'bio', 'avatar', 'createdAt']
        });
        
        if (!user) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        
        // Contar posts do usuário
        const Post = require('../models/Post');
        const postsCount = await Post.count({ where: { usuario_id: user.id } });
        
        // Contar seguidores
        const Seguidor = require('../models/Seguidor');
        const seguidoresCount = await Seguidor.count({ where: { seguindo_id: user.id } });
        const seguindoCount = await Seguidor.count({ where: { seguidor_id: user.id } });
        
        // Verificar se o usuário logado segue este perfil
        let isFollowing = false;
        if (req.usuarioId && req.usuarioId !== user.id) {
            const following = await Seguidor.findOne({
                where: { seguidor_id: req.usuarioId, seguindo_id: user.id }
            });
            isFollowing = !!following;
        }
        
        res.json({
            ...user.toJSON(),
            posts_count: postsCount,
            seguidores_count: seguidoresCount,
            seguindo_count: seguindoCount,
            isFollowing,
            isOwnProfile: req.usuarioId === user.id
        });
    } catch (err) {
        console.error('Erro getPerfilByUsername:', err);
        res.status(500).json({ msg: 'Erro no servidor' });
    }
};

// Buscar posts de um usuário
exports.getPostsByUser = async (req, res) => {
    try {
        const { id } = req.params;
        const Post = require('../models/Post');
        
        const posts = await Post.findAll({
            where: { usuario_id: id },
            order: [['createdAt', 'DESC']],
            include: [{
                model: User,
                attributes: ['id', 'display_name', 'username', 'avatar']
            }]
        });
        
        res.json(posts);
    } catch (err) {
        console.error('Erro getPostsByUser:', err);
        res.status(500).json({ msg: 'Erro no servidor' });
    }
};

// Seguir usuário
exports.seguir = async (req, res) => {
    try {
        const { id } = req.params;
        const Seguidor = require('../models/Seguidor');
        
        if (req.usuarioId === parseInt(id)) {
            return res.status(400).json({ msg: 'Não pode seguir a si mesmo' });
        }
        
        const existing = await Seguidor.findOne({
            where: { seguidor_id: req.usuarioId, seguindo_id: id }
        });
        
        if (existing) {
            return res.status(400).json({ msg: 'Já segue este usuário' });
        }
        
        await Seguidor.create({
            seguidor_id: req.usuarioId,
            seguindo_id: id
        });
        
        res.json({ msg: 'Seguindo com sucesso' });
    } catch (err) {
        console.error('Erro seguir:', err);
        res.status(500).json({ msg: 'Erro ao seguir' });
    }
};

// Deixar de seguir
exports.deixarSeguir = async (req, res) => {
    try {
        const { id } = req.params;
        const Seguidor = require('../models/Seguidor');
        
        await Seguidor.destroy({
            where: { seguidor_id: req.usuarioId, seguindo_id: id }
        });
        
        res.json({ msg: 'Deixou de seguir' });
    } catch (err) {
        console.error('Erro deixarSeguir:', err);
        res.status(500).json({ msg: 'Erro ao deixar de seguir' });
    }
};

// Listar seguidores
exports.getSeguidores = async (req, res) => {
    try {
        const { id } = req.params;
        const Seguidor = require('../models/Seguidor');
        const User = require('../models/User');
        
        const seguidores = await Seguidor.findAll({
            where: { seguindo_id: id },
            include: [{
                model: User,
                as: 'seguidor',
                attributes: ['id', 'username', 'display_name', 'avatar']
            }]
        });
        
        res.json(seguidores.map(s => s.seguidor));
    } catch (err) {
        console.error('Erro getSeguidores:', err);
        res.status(500).json({ msg: 'Erro no servidor' });
    }
};

// Listar quem o usuário segue
exports.getSeguindo = async (req, res) => {
    try {
        const { id } = req.params;
        const Seguidor = require('../models/Seguidor');
        const User = require('../models/User');
        
        const seguindo = await Seguidor.findAll({
            where: { seguidor_id: id },
            include: [{
                model: User,
                as: 'seguindo',
                attributes: ['id', 'username', 'display_name', 'avatar']
            }]
        });
        
        res.json(seguindo.map(s => s.seguindo));
    } catch (err) {
        console.error('Erro getSeguindo:', err);
        res.status(500).json({ msg: 'Erro no servidor' });
    }
};
