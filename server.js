const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./database/connection');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

// Rota de teste
app.get('/', (req, res) => {
    res.json({ msg: 'API Bem Bolado funcionando! 🚀' });
});

// Sincronizar banco de dados e iniciar servidor
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Testar conexão com o banco
        await sequelize.authenticate();
        console.log('✅ Conexão com o banco de dados estabelecida');
        
        // Sincronizar modelos (cria as tabelas se não existirem)
        await sequelize.sync({ alter: true });
        console.log('✅ Banco de dados sincronizado');
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            console.log(`📱 API disponível em: http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Erro ao iniciar o servidor:', err);
        process.exit(1);
    }
}

startServer();
