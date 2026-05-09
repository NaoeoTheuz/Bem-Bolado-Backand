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
            avatar: usuario.avatar,
            handle: '@' + nomeExibicao.toLowerCase().replace(/\s/g, ''),
            timestamp: post.createdAt,
            curtidas: 0,
            curtido: false,
            salvos: 0,
            salvo: false,
            premium: false,
            premium_tipo: null,
            premium_ate: null,
            prioridade: 0
        });
        
    } catch (err) {
        console.error('Erro criarPost:', err);
        res.status(500).json({ msg: 'Erro ao criar publicação' });
    }
};

// Listar todas as publicações - COM AVATAR, PREMIUM E PRIORIDADE
exports.listarPosts = async (req, res) => {
    try {
        const posts = await Post.findAll({
            order: [
                ['prioridade', 'DESC'],  // Impulsionado (2) > Destaque (1) > Normal (0)
                ['createdAt', 'DESC']    // Depois por data
            ]
        });
        
        const postsFormatados = [];
        
        for (const post of posts) {
            try {
                // Verificar se premium expirou
                let premium = post.premium || false;
                let premium_tipo = post.premium_tipo || null;
                let premium_ate = post.premium_ate || null;
                let prioridade = post.prioridade || 0;
                
                if (premium && premium_ate && new Date() > new Date(premium_ate)) {
                    // Expirou, desativar premium
                    await post.update({
                        premium: false,
                        premium_ate: null,
                        premium_tipo: null,
                        prioridade: 0
                    });
                    premium = false;
                    premium_tipo = null;
                    premium_ate = null;
                    prioridade = 0;
                }
                
                // Buscar usuário manualmente COM AVATAR
                const usuario = await User.findByPk(post.usuario_id, {
                    attributes: ['id', 'username', 'display_name', 'avatar']
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
                const avatar = usuario ? (usuario.avatar || null) : null;
                
                postsFormatados.push({
                    id: post.id,
                    imagem: post.imagem,
                    descricao: post.descricao,
                    hashtag: post.hashtag,
                    usuario_id: post.usuario_id,
                    display_name: nomeExibicao,
                    username: username,
                    avatar: avatar,
                    handle: '@' + nomeExibicao.toLowerCase().replace(/\s/g, ''),
                    timestamp: post.createdAt,
                    curtidas: curtidas,
                    curtido: curtido,
                    salvos: salvos,
                    salvo: salvo,
                    premium: premium,
                    premium_tipo: premium_tipo,
                    premium_ate: premium_ate,
                    prioridade: prioridade
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
        console.error('Erro toggleSalvar:', err);
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

// =============================================
// FUNÇÕES DE POST PREMIUM
// =============================================

// Tornar post premium (com prioridade)
exports.tornarPremium = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, valor } = req.body;
        
        const post = await Post.findByPk(id);
        
        if (!post) {
            return res.status(404).json({ erro: 'Post não encontrado' });
        }
        
        if (post.usuario_id !== req.usuarioId) {
            return res.status(403).json({ erro: 'Você não é o dono deste post' });
        }
        
        if (post.premium) {
            return res.status(400).json({ erro: 'Este post já é premium' });
        }
        
        // Calcular data de expiração (24 horas)
        const premiumAte = new Date();
        premiumAte.setHours(premiumAte.getHours() + 24);
        
        // Definir prioridade baseada no tipo
        let prioridade = 1; // destaque
        if (tipo === 'impulsionado') {
            prioridade = 2; // impulsionado tem prioridade maior
        }
        
        // Atualizar post
        await post.update({
            premium: true,
            premium_ate: premiumAte,
            premium_tipo: tipo,
            prioridade: prioridade
        });
        
        console.log(`💰 Post ${id} tornou-se premium ${tipo} (prioridade ${prioridade}) por R$ ${valor}`);
        
        res.json({ 
            sucesso: true, 
            mensagem: `Post agora é premium (${tipo === 'destaque' ? 'Destaque' : 'Impulsionado'}) por 24h`,
            premium: true,
            premium_ate: premiumAte,
            prioridade: prioridade
        });
        
    } catch (err) {
        console.error('Erro tornarPremium:', err);
        res.status(500).json({ erro: 'Erro ao processar' });
    }
};

// Verificar se post ainda é premium (atualizar expirados)
exports.verificarPremium = async (req, res) => {
    try {
        const { id } = req.params;
        
        const post = await Post.findByPk(id);
        
        if (!post) {
            return res.status(404).json({ erro: 'Post não encontrado' });
        }
        
        // Verificar se expirou
        if (post.premium && post.premium_ate && new Date() > new Date(post.premium_ate)) {
            await post.update({
                premium: false,
                premium_ate: null,
                premium_tipo: null,
                prioridade: 0
            });
            return res.json({ premium: false, expirado: true });
        }
        
        res.json({ 
            premium: post.premium || false,
            premium_ate: post.premium_ate || null,
            premium_tipo: post.premium_tipo || null,
            prioridade: post.prioridade || 0
        });
        
    } catch (err) {
        console.error('Erro verificarPremium:', err);
        res.status(500).json({ erro: 'Erro ao verificar' });
    }
};

// =============================================
// DENUNCIAR POST
// =============================================
exports.denunciarPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { motivo, detalhes } = req.body;
        const usuarioId = req.usuarioId;
        
        // Verificar se o post existe
        const post = await Post.findByPk(postId);
        if (!post) {
            return res.status(404).json({ erro: 'Post não encontrado' });
        }
        
        // Não pode denunciar o próprio post
        if (post.usuario_id === usuarioId) {
            return res.status(400).json({ erro: 'Você não pode denunciar seu próprio post' });
        }
        
        // Armazenamento temporário em memória (enquanto não tem banco de denúncias)
        if (!global.denuncias) {
            global.denuncias = [];
        }
        
        // Verificar se já denunciou este post
        const jaDenunciou = global.denuncias.some(d => d.post_id === parseInt(postId) && d.denunciante_id === usuarioId);
        
        if (jaDenunciou) {
            return res.status(400).json({ erro: 'Você já denunciou este post' });
        }
        
        // Buscar dados do autor do post e do denunciante
        const postAutor = await User.findByPk(post.usuario_id);
        const denunciante = await User.findByPk(usuarioId);
        
        // Criar denúncia
        const novaDenuncia = {
            id: global.denuncias.length + 1,
            post_id: parseInt(postId),
            post_conteudo: post.descricao || '',
            post_imagem: post.imagem || null,
            post_hashtag: post.hashtag || '',
            denunciante_id: usuarioId,
            denunciante_nome: denunciante?.display_name || denunciante?.username || 'Usuário',
            denunciado_id: post.usuario_id,
            denunciado_nome: postAutor?.display_name || postAutor?.username || 'Usuário',
            motivo: motivo,
            descricao: detalhes || '',
            status: 'pendente',
            createdAt: new Date().toISOString()
        };
        
        global.denuncias.push(novaDenuncia);
        
        console.log('📝 Nova denúncia registrada:', novaDenuncia);
        
        res.status(201).json({ 
            mensagem: 'Denúncia enviada com sucesso! Nossa equipe irá analisar.',
            denuncia: novaDenuncia 
        });
        
    } catch (err) {
        console.error('Erro ao processar denúncia:', err);
        res.status(500).json({ erro: 'Erro ao processar denúncia' });
    }
};
