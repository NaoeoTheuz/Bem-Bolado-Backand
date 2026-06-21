const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const NotificacaoAdmin = sequelize.define('NotificacaoAdmin', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID do administrador'
    },
    tipo: {
        type: DataTypes.ENUM('nova_denuncia', 'denuncia_respondida', 'usuario_bloqueado', 'novo_admin', 'dados_fornecidos'),
        allowNull: false
    },
    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mensagem: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    lida: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    link: {
        type: DataTypes.STRING,
        allowNull: true
    },
    dados_extras: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'notificacoes_admin',
    timestamps: true,
    underscored: true
});

module.exports = NotificacaoAdmin;
