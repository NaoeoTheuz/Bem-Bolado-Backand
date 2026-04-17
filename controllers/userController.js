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
        
        res.json(user);
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
