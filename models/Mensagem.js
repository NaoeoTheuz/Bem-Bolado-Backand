const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Mensagem = sequelize.define('Mensagem', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    chat_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    remetente_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    conteudo: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    lida: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'mensagens',
    timestamps: true
});

module.exports = Mensagem;
