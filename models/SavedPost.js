const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const SavedPost = sequelize.define('SavedPost', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    post_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = SavedPost;