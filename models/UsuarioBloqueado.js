const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const UsuarioBloqueado = sequelize.define('UsuarioBloqueado', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Usuário que bloqueou'
    },
    bloqueado_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Usuário que foi bloqueado'
    }
}, {
    tableName: 'usuarios_bloqueados',
    timestamps: true,
    underscored: true
});

module.exports = UsuarioBloqueado;
