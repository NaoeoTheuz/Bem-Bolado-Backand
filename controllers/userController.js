const User = require('../models/User');

exports.getPerfil = async (req, res) => {
    try {
        const user = await User.findByPk(req.usuarioId, {
            attributes: { exclude: ['senha'] }
        });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro no servidor' });
    }
};

exports.atualizarPerfil = async (req, res) => {
    try {
        const { nome, bio } = req.body;
        
        await User.update(
            { nome, bio },
            { where: { id: req.usuarioId } }
        );
        
        res.json({ msg: 'Perfil atualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro no servidor' });
    }
};

exports.atualizarConfiguracoes = async (req, res) => {
    try {
        const { tema_escuro, notificacoes_curtidas, notificacoes_comentarios, privado } = req.body;
        
        await User.update(
            { tema_escuro, notificacoes_curtidas, notificacoes_comentarios, privado },
            { where: { id: req.usuarioId } }
        );
        
        res.json({ msg: 'Configurações atualizadas' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro no servidor' });
    }
};