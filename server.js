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
