const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./database/connection');

// IMPORTAR MIDDLEWARES
const authMiddleware = require('./middlewares/authMiddleware');

// IMPORTAR MODELOS PRIMEIRO
const User = require('./models/User');
const Post = require('./models/Post');
const Like = require('./models/Like');
const SavedPost = require('./models/SavedPost');

// IMPORTAR MODELOS DO CHAT
const Chat = require('./models/Chat');
const ChatParticipante = require('./models/ChatParticipante');
const Mensagem = require('./models/Mensagem');

// IMPORTAR MODELO DE SEGUIDORES
const Seguidor = require('./models/Seguidor');

// IMPORTAR MODELOS DE ADMIN/MODERAÇÃO
const Denuncia = require('./models/Denuncia');
const NotificacaoAdmin = require('./models/NotificacaoAdmin');

// CONFIGURAR ASSOCIAÇÕES DIRETAMENTE AQUI
// Associações do User (já existentes)
User.hasMany(Post, { foreignKey: 'usuario_id' });
User.hasMany(Like, { foreignKey: 'usuario_id' });
User.hasMany(SavedPost, { foreignKey: 'usuario_id' });

// Associações do Post
Post.belongsTo(User, { foreignKey: 'usuario_id' });
Post.hasMany(Like, { foreignKey: 'post_id' });
Post.hasMany(SavedPost, { foreignKey: 'post_id' });

// Associações do Like
Like.belongsTo(User, { foreignKey: 'usuario_id' });
Like.belongsTo(Post, { foreignKey: 'post_id' });

// Associações do SavedPost
SavedPost.belongsTo(User, { foreignKey: 'usuario_id' });
SavedPost.belongsTo(Post, { foreignKey: 'post_id' });

// =============================================
// ASSOCIAÇÕES DO SISTEMA DE CHAT (CORRIGIDAS)
// =============================================

// Chat com Usuários (muitos para muitos)
Chat.belongsToMany(User, { through: ChatParticipante, foreignKey: 'chat_id' });
User.belongsToMany(Chat, { through: ChatParticipante, foreignKey: 'usuario_id' });

// Chat com Mensagens (COM ALIAS)
Chat.hasMany(Mensagem, { foreignKey: 'chat_id', as: 'mensagens' });
Mensagem.belongsTo(Chat, { foreignKey: 'chat_id', as: 'chat' });

// Mensagem com Usuário (remetente)
Mensagem.belongsTo(User, { foreignKey: 'remetente_id', as: 'remetente' });
User.hasMany(Mensagem, { foreignKey: 'remetente_id', as: 'mensagens_enviadas' });

// ChatParticipante com User e Chat
ChatParticipante.belongsTo(User, { foreignKey: 'usuario_id', as: 'usuario' });
ChatParticipante.belongsTo(Chat, { foreignKey: 'chat_id', as: 'chat' });

// =============================================
// ASSOCIAÇÕES DO SISTEMA DE SEGUIDORES
// =============================================
Seguidor.belongsTo(User, { as: 'seguidor', foreignKey: 'seguidor_id' });
Seguidor.belongsTo(User, { as: 'seguindo', foreignKey: 'seguindo_id' });
User.hasMany(Seguidor, { as: 'seguidores', foreignKey: 'seguindo_id' });
User.hasMany(Seguidor, { as: 'seguindo', foreignKey: 'seguidor_id' });

// =============================================
// ASSOCIAÇÕES DO SISTEMA DE MODERAÇÃO
// =============================================

// Associações de Denúncia
Denuncia.belongsTo(User, { as: 'denunciante', foreignKey: 'denunciante_id' });
Denuncia.belongsTo(User, { as: 'denunciado', foreignKey: 'denunciado_id' });
User.hasMany(Denuncia, { as: 'denuncias_feitas', foreignKey: 'denunciante_id' });
User.hasMany(Denuncia, { as: 'denuncias_recebidas', foreignKey: 'denunciado_id' });

// Associações de Notificações Admin
NotificacaoAdmin.belongsTo(User, { as: 'admin', foreignKey: 'admin_id' });
User.hasMany(NotificacaoAdmin, { as: 'notificacoes', foreignKey: 'admin_id' });

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api', chatRoutes); // Rotas do chat

app.get('/', (req, res) => {
    res.json({ msg: 'API Bem Bolado funcionando! 🚀' });
});

// =============================================
// ROTAS DE ADMIN (APENAS ADMINISTRADORES)
// =============================================

// Middleware para verificar se é admin
const verificarAdmin = async (req, res, next) => {
    try {
        // CORREÇÃO: usar req.usuarioId (vem do authMiddleware)
        const usuario = await User.findByPk(req.usuarioId);
        if (!usuario || !usuario.admin) {
            return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
        }
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao verificar permissão' });
    }
};

// LISTAR TODAS AS DENÚNCIAS
app.get('/api/admin/denuncias', authMiddleware, verificarAdmin, async (req, res) => {
    try {
        const denuncias = await Denuncia.findAll({
            include: [
                { model: User, as: 'denunciante', attributes: ['id', 'display_name', 'username', 'avatar'] },
                { model: User, as: 'denunciado', attributes: ['id', 'display_name', 'username', 'avatar'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        res.json(denuncias);
    } catch (err) {
        console.error('Erro ao listar denúncias:', err);
        res.status(500).json({ erro: 'Erro ao carregar denúncias' });
    }
});

// ATUALIZAR STATUS DA DENÚNCIA
app.put('/api/admin/denuncias/:id', authMiddleware, verificarAdmin, async (req, res) => {
    try {
        const denuncia = await Denuncia.findByPk(req.params.id);
        
        if (!denuncia) {
            return res.status(404).json({ erro: 'Denúncia não encontrada' });
        }
        
        const { status } = req.body;
        denuncia.status = status;
        await denuncia.save();
        
        res.json({ mensagem: 'Status atualizado com sucesso', denuncia });
    } catch (err) {
        console.error('Erro ao atualizar denúncia:', err);
        res.status(500).json({ erro: 'Erro ao atualizar status' });
    }
});

// TOMAR AÇÃO CONTRA USUÁRIO (suspender, banir, etc)
app.post('/api/admin/denuncias/:id/acao', authMiddleware, verificarAdmin, async (req, res) => {
    try {
        const { acao, dias, observacao, usuario_afetado_id } = req.body;
        const denuncia = await Denuncia.findByPk(req.params.id);
        
        if (!denuncia) {
            return res.status(404).json({ erro: 'Denúncia não encontrada' });
        }
        
        const usuarioAfetado = await User.findByPk(usuario_afetado_id);
        
        if (!usuarioAfetado) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        
        let mensagem = '';
        
        switch(acao) {
            case 'suspender':
                const dataSuspensao = new Date();
                dataSuspensao.setDate(dataSuspensao.getDate() + (dias || 5));
                usuarioAfetado.suspenso_ate = dataSuspensao;
                usuarioAfetado.suspenso = true;
                await usuarioAfetado.save();
                mensagem = `Usuário ${usuarioAfetado.display_name} suspenso por ${dias || 5} dias`;
                break;
            case 'banir':
                usuarioAfetado.banido = true;
                await usuarioAfetado.save();
                mensagem = `Usuário ${usuarioAfetado.display_name} foi banido permanentemente`;
                break;
            case 'observacao':
                usuarioAfetado.em_observacao = true;
                await usuarioAfetado.save();
                mensagem = `Usuário ${usuarioAfetado.display_name} marcado para observação`;
                break;
            case 'arquivar':
                denuncia.status = 'arquivada';
                await denuncia.save();
                mensagem = 'Denúncia arquivada sem ação';
                break;
            default:
                mensagem = 'Ação processada';
        }
        
        // Atualizar status da denúncia
        if (acao !== 'arquivar') {
            denuncia.status = 'analisada';
            await denuncia.save();
        }
        
        res.json({ mensagem, usuario: usuarioAfetado });
    } catch (err) {
        console.error('Erro ao processar ação:', err);
        res.status(500).json({ erro: 'Erro ao processar ação' });
    }
});

// LISTAR TODOS OS USUÁRIOS (para admin)
app.get('/api/usuarios', authMiddleware, verificarAdmin, async (req, res) => {
    try {
        const usuarios = await User.findAll({
            attributes: ['id', 'username', 'display_name', 'email', 'avatar', 'admin', 'suspenso', 'banido', 'em_observacao', 'createdAt']
        });
        res.json(usuarios);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao carregar usuários' });
    }
});

// TORNAR USUÁRIO ADMIN
app.post('/api/admin/tornar-admin/:email', authMiddleware, verificarAdmin, async (req, res) => {
    try {
        const { email } = req.params;
        const usuario = await User.findOne({ where: { email } });
        
        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        
        usuario.admin = true;
        await usuario.save();
        
        res.json({ mensagem: `${usuario.display_name} agora é administrador!` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao tornar admin' });
    }
});

// NOTIFICAÇÕES DO ADMIN
app.get('/api/admin/notificacoes', authMiddleware, verificarAdmin, async (req, res) => {
    try {
        const notificacoes = await NotificacaoAdmin.findAll({
            where: { admin_id: req.usuarioId },
            order: [['createdAt', 'DESC']]
        });
        res.json(notificacoes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao carregar notificações' });
    }
});

app.put('/api/admin/notificacoes/:id/ler', authMiddleware, verificarAdmin, async (req, res) => {
    try {
        const notificacao = await NotificacaoAdmin.findByPk(req.params.id);
        if (notificacao) {
            notificacao.lida = true;
            await notificacao.save();
        }
        res.json({ mensagem: 'Notificação marcada como lida' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao marcar notificação' });
    }
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexão com o banco de dados estabelecida');
        
        await sequelize.sync({ alter: false });
        console.log('✅ Banco de dados sincronizado');
        console.log('✅ Associações configuradas');
        console.log('✅ Sistema de Chat ativado');
        console.log('✅ Sistema de Seguidores ativado');
        console.log('✅ Sistema de Moderação ativado');
        console.log('✅ Rotas de Admin ativadas');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Erro ao iniciar o servidor:', err);
        process.exit(1);
    }
}

startServer();
