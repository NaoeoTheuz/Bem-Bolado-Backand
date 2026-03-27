const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Post = sequelize.define('Post', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    imagem: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    hashtag: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

module.exports = Post;