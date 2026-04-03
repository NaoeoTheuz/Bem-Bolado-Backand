const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
        define: {
            timestamps: true,
            underscored: true
        }
    }
);

module.exports = sequelize;
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
        }
    }
);

// Importar modelos
const User = require('../models/User');
const Post = require('../models/Post');
const Like = require('../models/Like');
const SavedPost = require('../models/SavedPost');

// Configurar associações
User.associate({ Post });
Post.associate({ User });

module.exports = sequelize;
