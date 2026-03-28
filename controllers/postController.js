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
        
        res.json({
            id: post.id,
            imagem: post.imagem,
            descricao: post.descricao,
            hashtag: post.hashtag,
            usuario: usuario.nome,
            handle: '@' + usuario.nome.toLowerCase().replace(/\s/g, ''),
            timestamp: post.createdAt,
            curtidas: 0,
            curtido: false,
            salvos: 0,
            salvo: false
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao criar publicação' });
    }
};

// Listar todas as publicações
exports.listarPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({
            order: [['createdAt', 'DESC']],
            include: [{ model: User, attributes: ['nome'] }]
        });
        
        const postsFormatados = await Promise.all(posts.map(async post => {
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
            
            return {
                id: post.id,
                imagem: post.imagem,
                descricao: post.descricao,
                hashtag: post.hashtag,
                usuario: post.User.nome,
                handle: '@' + post.User.nome.toLowerCase().replace(/\s/g, ''),
                timestamp: post.createdAt,
                curtidas: curtidas,
                curtido: curtido,
                salvos: salvos,
                salvo: salvo
            };
        }));
        
        res.json(postsFormatados);
        
    } catch (err) {
        console.error(err);
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
            res.json({ msg: 'Descurtido', curtido: false });
        } else {
            await Like.create({ post_id: id, usuario_id: req.usuarioId });
            res.json({ msg: 'Curtido', curtido: true });
        }
        
    } catch (err) {
        console.error(err);
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
            res.json({ msg: 'Removido dos salvos', salvo: false });
        } else {
            await SavedPost.create({ post_id: id, usuario_id: req.usuarioId });
            res.json({ msg: 'Salvo', salvo: true });
        }
        
    } catch (err) {
        console.error(err);
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
        console.error(err);
        res.status(500).json({ msg: 'Erro ao excluir publicação' });
    }
};