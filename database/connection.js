const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        port: 3306,
        logging: false,
        dialectOptions: {
            connectTimeout: 60000
        },
        define: {
            timestamps: true,
            underscored: true
        }
    }
);

// Importar modelos
const User = require('../models/User');
const Post = require('../models/Post');
const Like = require('../models/Like');
const SavedPost = require('../models/SavedPost');

// Configurar associações
User.associate = function(models) {
    User.hasMany(models.Post, { foreignKey: 'usuario_id' });
    User.hasMany(models.Like, { foreignKey: 'usuario_id' });
    User.hasMany(models.SavedPost, { foreignKey: 'usuario_id' });
};

Post.associate = function(models) {
    Post.belongsTo(models.User, { foreignKey: 'usuario_id' });
    Post.hasMany(models.Like, { foreignKey: 'post_id' });
    Post.hasMany(models.SavedPost, { foreignKey: 'post_id' });
};

Like.associate = function(models) {
    Like.belongsTo(models.User, { foreignKey: 'usuario_id' });
    Like.belongsTo(models.Post, { foreignKey: 'post_id' });
};

SavedPost.associate = function(models) {
    SavedPost.belongsTo(models.User, { foreignKey: 'usuario_id' });
    SavedPost.belongsTo(models.Post, { foreignKey: 'post_id' });
};

// Executar associações
User.associate({ Post, Like, SavedPost });
Post.associate({ User, Like, SavedPost });
if (Like.associate) Like.associate({ User, Post });
if (SavedPost.associate) SavedPost.associate({ User, Post });

// Testar conexão
sequelize.authenticate()
    .then(() => console.log('✅ Conexão com o banco de dados estabelecida com sucesso!'))
    .catch(err => console.error('❌ Erro ao conectar ao banco:', err));

module.exports = sequelize;
