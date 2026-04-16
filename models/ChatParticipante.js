const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const ChatParticipante = sequelize.define('ChatParticipante', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    chat_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    usuario_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    ultima_leitura: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'chat_participantes',
    timestamps: true
});

module.exports = ChatParticipante;
