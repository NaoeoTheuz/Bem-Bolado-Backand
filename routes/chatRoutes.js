const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const Chat = require('../models/Chat');
const ChatParticipante = require('../models/ChatParticipante');
const Mensagem = require('../models/Mensagem');
const User = require('../models/User');

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

// Listar todos os chats do usuário (CORRIGIDA)
router.get('/chats', auth, async (req, res) => {
    try {
        // Buscar todos os chats com participantes
        const chats = await Chat.findAll({
            include: [
                {
                    model: User,
                    through: { attributes: [] },
                    attributes: ['id', 'display_name', 'email']
                }
            ]
        });
        
        // Filtrar apenas os chats que contêm o usuário atual
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
        
        // Buscar chat existente entre os dois
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
            // Retornar o chat existente com dados completos
            const chatExistente = await Chat.findByPk(chatsExistentes[0].id, {
                include: [{ model: User, through: { attributes: [] }, attributes: ['id', 'display_name', 'email'] }]
            });
            return res.json(chatExistente);
        }
        
        // Criar novo chat
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

module.exports = router;


user.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 50]
        }
    },
    display_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [3, 100]
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    senha: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cpf: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    bio: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },
    privado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    tema_escuro: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    notificacoes_curtidas: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    notificacoes_comentarios: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    underscored: true
});

// ASSOCIAÇÕES COMPLETAS
User.associate = (models) => {
    User.hasMany(models.Post, { foreignKey: 'usuario_id' });
    User.hasMany(models.Like, { foreignKey: 'usuario_id' });
    User.hasMany(models.SavedPost, { foreignKey: 'usuario_id' });
};

module.exports = User;

server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./database/connection');

// IMPORTAR MODELOS PRIMEIRO
const User = require('./models/User');
const Post = require('./models/Post');
const Like = require('./models/Like');
const SavedPost = require('./models/SavedPost');

// IMPORTAR MODELOS DO CHAT
const Chat = require('./models/Chat');
const ChatParticipante = require('./models/ChatParticipante');
const Mensagem = require('./models/Mensagem');

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

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexão com o banco de dados estabelecida');
        
        await sequelize.sync({ alter: false });
        console.log('✅ Banco de dados sincronizado');
        console.log('✅ Associações configuradas');
        console.log('✅ Sistema de Chat ativado');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Erro ao iniciar o servidor:', err);
        process.exit(1);
    }
}

startServer();
