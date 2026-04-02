const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 50]
        }
    },
    display_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [3, 100]
        }
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
