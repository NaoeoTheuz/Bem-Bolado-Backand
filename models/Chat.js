const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Chat = sequelize.define('Chat', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    tipo: {
        type: DataTypes.ENUM('individual', 'grupo'),
        defaultValue: 'individual'
    }
}, {
    tableName: 'chats',
    timestamps: true
});

module.exports = Chat;
