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

// Executar associações
if (User.associate) User.associate({ Post, Like, SavedPost });
if (Post.associate) Post.associate({ User, Like, SavedPost });
if (Like.associate) Like.associate({ User, Post });
if (SavedPost.associate) SavedPost.associate({ User, Post });

module.exports = sequelize;
