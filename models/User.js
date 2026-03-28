const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    senha: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cpf: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    bio: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },
    privado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    tema_escuro: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    notificacoes_curtidas: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    notificacoes_comentarios: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = User;