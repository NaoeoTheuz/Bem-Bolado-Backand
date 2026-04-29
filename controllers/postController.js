postcontroller.js atual

const Post = require('../models/Post');
const Like = require('../models/Like');
const SavedPost = require('../models/SavedPost');
const User = require('../models/User');

// Criar nova publicação
exports.criarPost = async (req, res) => {
    try {
        const { imagem, descricao, hashtag } = req.body;
        
        const post = await Post.create({
            usuario_id: req.usuarioId,
            imagem,
            descricao,
            hashtag
        });
        
        const usuario = await User.findByPk(req.usuarioId);
        
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        
        const nomeExibicao = usuario.display_name || usuario.username || 'Usuário';
        
        res.json({
            id: post.id,
            imagem: post.imagem,
            descricao: post.descricao,
            hashtag: post.hashtag,
            usuario_id: usuario.id,
            display_name: nomeExibicao,
            username: usuario.username,
            avatar: usuario.avatar,  // ← ADICIONADO
            handle: '@' + nomeExibicao.toLowerCase().replace(/\s/g, ''),
            timestamp: post.createdAt,
            curtidas: 0,
            curtido: false,
            salvos: 0,
            salvo: false
        });
        
    } catch (err) {
        console.error('Erro criarPost:', err);
        res.status(500).json({ msg: 'Erro ao criar publicação' });
    }
};

// Listar todas as publicações - COM AVATAR
exports.listarPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({
            order: [['createdAt', 'DESC']]
        });
        
        const postsFormatados = [];
        
        for (const post of posts) {
            try {
                // Buscar usuário manualmente COM AVATAR
                const usuario = await User.findByPk(post.usuario_id, {
                    attributes: ['id', 'username', 'display_name', 'avatar']  // ← ADICIONADO AVATAR
                });
                
                const curtidas = await Like.count({ where: { post_id: post.id } });
                const salvos = await SavedPost.count({ where: { post_id: post.id } });
                
                let curtido = false;
                let salvo = false;
                
                if (req.usuarioId) {
                    curtido = await Like.findOne({ 
                        where: { post_id: post.id, usuario_id: req.usuarioId } 
                    }) !== null;
                    salvo = await SavedPost.findOne({ 
                        where: { post_id: post.id, usuario_id: req.usuarioId } 
                    }) !== null;
                }
                
                const nomeExibicao = usuario ? (usuario.display_name || usuario.username || 'Usuário') : 'Usuário';
                const username = usuario ? (usuario.username || 'usuario') : 'usuario';
                const avatar = usuario ? (usuario.avatar || null) : null;  // ← ADICIONADO
                
                postsFormatados.push({
                    id: post.id,
                    imagem: post.imagem,
                    descricao: post.descricao,
                    hashtag: post.hashtag,
                    usuario_id: post.usuario_id,
                    display_name: nomeExibicao,
                    username: username,
                    avatar: avatar,  // ← ADICIONADO
                    handle: '@' + nomeExibicao.toLowerCase().replace(/\s/g, ''),
                    timestamp: post.createdAt,
                    curtidas: curtidas,
                    curtido: curtido,
                    salvos: salvos,
                    salvo: salvo
                });
            } catch (innerErr) {
                console.error('Erro processando post:', post.id, innerErr.message);
            }
        }
        
        res.json(postsFormatados);
        
    } catch (err) {
        console.error('Erro listarPosts:', err);
        res.status(500).json({ msg: 'Erro ao listar publicações' });
    }
};

// Curtir/Descurtir
exports.toggleCurtida = async (req, res) => {
    try {
        const { id } = req.params;
        
        const curtidaExistente = await Like.findOne({
            where: { post_id: id, usuario_id: req.usuarioId }
        });
        
        if (curtidaExistente) {
            await curtidaExistente.destroy();
            res.json({ curtido: false });
        } else {
            await Like.create({ post_id: id, usuario_id: req.usuarioId });
            res.json({ curtido: true });
        }
        
    } catch (err) {
        console.error('Erro toggleCurtida:', err);
        res.status(500).json({ msg: 'Erro ao processar curtida' });
    }
};

// Salvar/Dessalvar
exports.toggleSalvar = async (req, res) => {
    try {
        const { id } = req.params;
        
        const salvoExistente = await SavedPost.findOne({
            where: { post_id: id, usuario_id: req.usuarioId }
        });
        
        if (salvoExistente) {
            await salvoExistente.destroy();
            res.json({ salvo: false });
        } else {
            await SavedPost.create({ post_id: id, usuario_id: req.usuarioId });
            res.json({ salvo: true });
        }
        
    } catch (err) {
        console.error('Ergo toggleSalvar:', err);
        res.status(500).json({ msg: 'Erro ao processar salvamento' });
    }
};

// Excluir publicação
exports.excluirPost = async (req, res) => {
    try {
        const { id } = req.params;
        
        const post = await Post.findByPk(id);
        
        if (!post) {
            return res.status(404).json({ msg: 'Publicação não encontrada' });
        }
        
        if (post.usuario_id !== req.usuarioId) {
            return res.status(403).json({ msg: 'Não autorizado' });
        }
        
        await Like.destroy({ where: { post_id: id } });
        await SavedPost.destroy({ where: { post_id: id } });
        await post.destroy();
        
        res.json({ msg: 'Publicação excluída' });
        
    } catch (err) {
        console.error('Erro excluirPost:', err);
        res.status(500).json({ msg: 'Erro ao excluir publicação' });
    }
};
