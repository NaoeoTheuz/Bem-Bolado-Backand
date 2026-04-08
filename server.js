const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./database/connection');

// IMPORTAR MODELOS PRIMEIRO
const User = require('./models/User');
const Post = require('./models/Post');
const Like = require('./models/Like');
const SavedPost = require('./models/SavedPost');

// CONFIGURAR ASSOCIAÇÕES DIRETAMENTE AQUI (sem arquivo separado)
// Associações do User
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

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.json({ msg: 'API Bem Bolado funcionando! 🚀' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexão com o banco de dados estabelecida');
        
        await sequelize.sync({ alter: true });
        console.log('✅ Banco de dados sincronizado');
        console.log('✅ Associações configuradas');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Erro ao iniciar o servidor:', err);
        process.exit(1);
    }
}

startServer();
